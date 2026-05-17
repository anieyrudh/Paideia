import {
  err,
  ok,
  seconds,
  type KernelResult,
  type Seconds,
} from "@paideia/shared";

export interface Complex {
  readonly re: number;
  readonly im: number;
}

export interface TransferFunction {
  readonly numerator: readonly number[];
  readonly denominator: readonly number[];
}

export interface PidGains {
  readonly kp: number;
  readonly ki: number;
  readonly kd: number;
  readonly derivativeFilterTimeSeconds?: Seconds;
}

export interface StepResponseOptions {
  readonly durationSeconds: Seconds;
  readonly dtSeconds: Seconds;
  readonly inputAmplitude?: number;
}

export interface StepResponseSample {
  readonly t: Seconds;
  readonly y: number;
}

export interface FrequencyResponsePoint {
  readonly frequencyRadPerSec: number;
  readonly value: Complex;
  readonly magnitude: number;
  readonly magnitudeDb: number;
  readonly phaseRad: number;
  readonly phaseDeg: number;
}

export const controlTolerance = {
  default: 1e-6,
  tight: 1e-9,
  loose: 1e-3,
} as const;

const polynomialZeroTolerance = 1e-12;
const maxStepSamples = 20_001;

const isFiniteNumber = (value: number): boolean => Number.isFinite(value);

const isEffectivelyZero = (value: number): boolean =>
  Math.abs(value) <= polynomialZeroTolerance;

const freezeNumbers = (values: readonly number[]): readonly number[] =>
  Object.freeze([...values]);

const freezeComplex = (value: Complex): Complex => Object.freeze({ ...value });

const complex = (re: number, im: number): Complex => ({ re, im });

const addComplex = (a: Complex, b: Complex): Complex =>
  complex(a.re + b.re, a.im + b.im);

const multiplyComplex = (a: Complex, b: Complex): Complex =>
  complex(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re);

const divideComplex = (a: Complex, b: Complex): KernelResult<Complex> => {
  const denominator = b.re * b.re + b.im * b.im;
  if (isEffectivelyZero(denominator)) {
    return err("undefined-at-point", "Transfer-function denominator is zero at this point");
  }

  return ok(
    complex(
      (a.re * b.re + a.im * b.im) / denominator,
      (a.im * b.re - a.re * b.im) / denominator,
    ),
  );
};

const complexMagnitude = (value: Complex): number =>
  Math.hypot(value.re, value.im);

const validateCoefficients = (
  coefficients: readonly number[],
  label: string,
): KernelResult<readonly number[]> => {
  if (coefficients.length === 0) {
    return err("precondition-violated", `${label} must contain at least one coefficient`);
  }

  for (const coefficient of coefficients) {
    if (!isFiniteNumber(coefficient)) {
      return err("precondition-violated", `${label} coefficients must be finite`);
    }
  }

  return ok(coefficients);
};

const trimLeadingZeros = (coefficients: readonly number[]): readonly number[] => {
  let firstNonZero = 0;
  while (
    firstNonZero < coefficients.length - 1 &&
    isEffectivelyZero(coefficients[firstNonZero] ?? 0)
  ) {
    firstNonZero += 1;
  }
  return coefficients.slice(firstNonZero);
};

const degree = (coefficients: readonly number[]): number => coefficients.length - 1;

const padLeft = (coefficients: readonly number[], length: number): readonly number[] => {
  if (coefficients.length >= length) return coefficients;
  return [...Array.from({ length: length - coefficients.length }, () => 0), ...coefficients];
};

const addPolynomials = (
  a: readonly number[],
  b: readonly number[],
): readonly number[] => {
  const length = Math.max(a.length, b.length);
  const paddedA = padLeft(a, length);
  const paddedB = padLeft(b, length);

  return trimLeadingZeros(
    paddedA.map((value, index) => value + (paddedB[index] ?? 0)),
  );
};

const multiplyPolynomials = (
  a: readonly number[],
  b: readonly number[],
): readonly number[] => {
  const result = Array.from({ length: a.length + b.length - 1 }, () => 0);

  for (let ai = 0; ai < a.length; ai += 1) {
    const av = a[ai];
    if (av === undefined) return [0];
    for (let bi = 0; bi < b.length; bi += 1) {
      const bv = b[bi];
      if (bv === undefined) return [0];
      result[ai + bi] = (result[ai + bi] ?? 0) + av * bv;
    }
  }

  return trimLeadingZeros(result);
};

const evaluatePolynomial = (
  coefficients: readonly number[],
  value: Complex,
): KernelResult<Complex> => {
  const valid = validateCoefficients(coefficients, "polynomial");
  if (!valid.ok) return valid;

  let total = complex(0, 0);
  for (const coefficient of coefficients) {
    total = addComplex(multiplyComplex(total, value), complex(coefficient, 0));
    if (!isFiniteNumber(total.re) || !isFiniteNumber(total.im)) {
      return err("numerical-instability", "Polynomial evaluation overflowed");
    }
  }

  return ok(total);
};

export const transferFunction = (
  numerator: readonly number[],
  denominator: readonly number[],
): KernelResult<TransferFunction> => {
  const validNumerator = validateCoefficients(numerator, "numerator");
  if (!validNumerator.ok) return validNumerator;
  const validDenominator = validateCoefficients(denominator, "denominator");
  if (!validDenominator.ok) return validDenominator;

  const trimmedNumerator = trimLeadingZeros(numerator);
  const trimmedDenominator = trimLeadingZeros(denominator);
  const denominatorLead = trimmedDenominator[0];
  if (denominatorLead === undefined || isEffectivelyZero(denominatorLead)) {
    return err("precondition-violated", "denominator must not be the zero polynomial");
  }

  const normalizedNumerator = trimmedNumerator.map(
    (coefficient) => coefficient / denominatorLead,
  );
  const normalizedDenominator = trimmedDenominator.map(
    (coefficient) => coefficient / denominatorLead,
  );

  return ok(
    Object.freeze({
      numerator: freezeNumbers(normalizedNumerator),
      denominator: freezeNumbers(normalizedDenominator),
    }),
  );
};

export const evaluateTransferFunction = (
  system: TransferFunction,
  s: Complex,
): KernelResult<Complex> => {
  if (!isFiniteNumber(s.re) || !isFiniteNumber(s.im)) {
    return err("precondition-violated", "s must be finite");
  }

  const numerator = evaluatePolynomial(system.numerator, s);
  if (!numerator.ok) return numerator;
  const denominator = evaluatePolynomial(system.denominator, s);
  if (!denominator.ok) return denominator;

  const value = divideComplex(numerator.value, denominator.value);
  if (!value.ok) return value;
  return ok(freezeComplex(value.value));
};

export const multiplyTransferFunctions = (
  a: TransferFunction,
  b: TransferFunction,
): KernelResult<TransferFunction> =>
  transferFunction(
    multiplyPolynomials(a.numerator, b.numerator),
    multiplyPolynomials(a.denominator, b.denominator),
  );

export const addTransferFunctions = (
  a: TransferFunction,
  b: TransferFunction,
): KernelResult<TransferFunction> =>
  transferFunction(
    addPolynomials(
      multiplyPolynomials(a.numerator, b.denominator),
      multiplyPolynomials(b.numerator, a.denominator),
    ),
    multiplyPolynomials(a.denominator, b.denominator),
  );

export const closeUnityFeedbackLoop = (
  openLoop: TransferFunction,
): KernelResult<TransferFunction> =>
  transferFunction(
    openLoop.numerator,
    addPolynomials(openLoop.denominator, openLoop.numerator),
  );

export const pidController = (gains: PidGains): KernelResult<TransferFunction> => {
  const { kp, ki, kd } = gains;
  if (![kp, ki, kd].every(isFiniteNumber)) {
    return err("precondition-violated", "PID gains must be finite");
  }

  const tau = gains.derivativeFilterTimeSeconds;
  if (tau !== undefined) {
    if (!isFiniteNumber(tau) || tau <= 0) {
      return err("precondition-violated", "derivativeFilterTimeSeconds must be positive");
    }
    return transferFunction([kp * tau + kd, kp + ki * tau, ki], [tau, 1, 0]);
  }

  return transferFunction([kd, kp, ki], [1, 0]);
};

const validateProper = (system: TransferFunction): KernelResult<void> => {
  if (degree(system.numerator) > degree(system.denominator)) {
    return err(
      "precondition-violated",
      "stepResponse requires a proper transfer function",
    );
  }
  return ok(undefined);
};

const denominatorOrder = (system: TransferFunction): KernelResult<number> => {
  const den = trimLeadingZeros(system.denominator);
  const lead = den[0];
  if (lead === undefined || isEffectivelyZero(lead)) {
    return err("precondition-violated", "denominator must not be the zero polynomial");
  }
  return ok(degree(den));
};

const derivative = (
  state: readonly number[],
  denominatorTailAscending: readonly number[],
  input: number,
): KernelResult<readonly number[]> => {
  if (state.length === 0) return ok(Object.freeze([]));

  const next = state.slice(1);
  let last = input;
  for (let index = 0; index < state.length; index += 1) {
    const coefficient = denominatorTailAscending[index];
    const stateValue = state[index];
    if (coefficient === undefined || stateValue === undefined) {
      return err("numerical-instability", "State-space dimensions are inconsistent");
    }
    last -= coefficient * stateValue;
  }

  const result = [...next, last];
  if (result.some((value) => !isFiniteNumber(value))) {
    return err("numerical-instability", "State derivative became non-finite");
  }

  return ok(Object.freeze(result));
};

const combineState = (
  state: readonly number[],
  increments: readonly number[],
  scale: number,
): KernelResult<readonly number[]> => {
  if (state.length !== increments.length) {
    return err("numerical-instability", "State-space dimensions are inconsistent");
  }

  const result = state.map((value, index) => value + scale * (increments[index] ?? 0));
  if (result.some((value) => !isFiniteNumber(value))) {
    return err("numerical-instability", "State integration became non-finite");
  }

  return ok(Object.freeze(result));
};

const rk4Step = (
  state: readonly number[],
  denominatorTailAscending: readonly number[],
  input: number,
  dt: number,
): KernelResult<readonly number[]> => {
  const k1 = derivative(state, denominatorTailAscending, input);
  if (!k1.ok) return k1;
  const s2 = combineState(state, k1.value, dt / 2);
  if (!s2.ok) return s2;
  const k2 = derivative(s2.value, denominatorTailAscending, input);
  if (!k2.ok) return k2;
  const s3 = combineState(state, k2.value, dt / 2);
  if (!s3.ok) return s3;
  const k3 = derivative(s3.value, denominatorTailAscending, input);
  if (!k3.ok) return k3;
  const s4 = combineState(state, k3.value, dt);
  if (!s4.ok) return s4;
  const k4 = derivative(s4.value, denominatorTailAscending, input);
  if (!k4.ok) return k4;

  const next = state.map((value, index) => {
    const k1v = k1.value[index] ?? 0;
    const k2v = k2.value[index] ?? 0;
    const k3v = k3.value[index] ?? 0;
    const k4v = k4.value[index] ?? 0;
    return value + (dt / 6) * (k1v + 2 * k2v + 2 * k3v + k4v);
  });

  if (next.some((value) => !isFiniteNumber(value))) {
    return err("numerical-instability", "State integration became non-finite");
  }

  return ok(Object.freeze(next));
};

const outputValue = (
  system: TransferFunction,
  state: readonly number[],
  input: number,
): KernelResult<number> => {
  const order = denominatorOrder(system);
  if (!order.ok) return order;

  if (order.value === 0) {
    const numeratorConstant = system.numerator[0];
    const denominatorConstant = system.denominator[0];
    if (numeratorConstant === undefined || denominatorConstant === undefined) {
      return err("precondition-violated", "Constant transfer function is malformed");
    }
    return ok((numeratorConstant / denominatorConstant) * input);
  }

  const numerator = padLeft(system.numerator, order.value + 1);
  const denominator = system.denominator;
  const direct = numerator[0] ?? 0;
  let total = direct * input;

  for (let stateIndex = 0; stateIndex < order.value; stateIndex += 1) {
    const numeratorIndex = numerator.length - 1 - stateIndex;
    const denominatorIndex = denominator.length - 1 - stateIndex;
    const numeratorCoefficient = numerator[numeratorIndex];
    const denominatorCoefficient = denominator[denominatorIndex];
    const stateValue = state[stateIndex];
    if (
      numeratorCoefficient === undefined ||
      denominatorCoefficient === undefined ||
      stateValue === undefined
    ) {
      return err("numerical-instability", "Output dimensions are inconsistent");
    }
    total += (numeratorCoefficient - denominatorCoefficient * direct) * stateValue;
  }

  if (!isFiniteNumber(total)) {
    return err("numerical-instability", "Output became non-finite");
  }

  return ok(total);
};

export const stepResponse = (
  system: TransferFunction,
  opts: StepResponseOptions,
): KernelResult<readonly StepResponseSample[]> => {
  const proper = validateProper(system);
  if (!proper.ok) return proper;

  const duration = opts.durationSeconds;
  const dt = opts.dtSeconds;
  const inputAmplitude = opts.inputAmplitude ?? 1;
  if (
    !isFiniteNumber(duration) ||
    !isFiniteNumber(dt) ||
    !isFiniteNumber(inputAmplitude) ||
    duration <= 0 ||
    dt <= 0
  ) {
    return err(
      "precondition-violated",
      "durationSeconds, dtSeconds, and inputAmplitude must be finite with positive time steps",
    );
  }

  const order = denominatorOrder(system);
  if (!order.ok) return order;
  const sampleCount = Math.floor(duration / dt) + 1;
  if (sampleCount > maxStepSamples) {
    return err("precondition-violated", `stepResponse would produce ${sampleCount} samples`);
  }

  const denominatorTailAscending = system.denominator.slice(1).reverse();
  let state: readonly number[] = Object.freeze(Array.from({ length: order.value }, () => 0));
  const samples: StepResponseSample[] = [];

  for (let sampleIndex = 0; sampleIndex < sampleCount; sampleIndex += 1) {
    const t = sampleIndex * dt;
    const y = outputValue(system, state, inputAmplitude);
    if (!y.ok) return y;
    samples.push(Object.freeze({ t: seconds(t), y: y.value }));

    if (sampleIndex < sampleCount - 1 && order.value > 0) {
      const nextState = rk4Step(state, denominatorTailAscending, inputAmplitude, dt);
      if (!nextState.ok) return nextState;
      state = nextState.value;
    }
  }

  return ok(Object.freeze(samples));
};

export const bode = (
  system: TransferFunction,
  frequenciesRadPerSec: readonly number[],
): KernelResult<readonly FrequencyResponsePoint[]> => {
  if (frequenciesRadPerSec.length === 0) {
    return err("precondition-violated", "frequenciesRadPerSec must not be empty");
  }

  const points: FrequencyResponsePoint[] = [];
  for (const frequency of frequenciesRadPerSec) {
    if (!isFiniteNumber(frequency) || frequency <= 0) {
      return err("precondition-violated", "Bode frequencies must be finite and positive");
    }

    const value = evaluateTransferFunction(system, complex(0, frequency));
    if (!value.ok) return value;
    const magnitude = complexMagnitude(value.value);
    if (!isFiniteNumber(magnitude) || magnitude <= 0) {
      return err("undefined-at-point", "Frequency response magnitude is zero or non-finite");
    }

    const phaseRad = Math.atan2(value.value.im, value.value.re);
    points.push(
      Object.freeze({
        frequencyRadPerSec: frequency,
        value: freezeComplex(value.value),
        magnitude,
        magnitudeDb: 20 * Math.log10(magnitude),
        phaseRad,
        phaseDeg: (phaseRad * 180) / Math.PI,
      }),
    );
  }

  return ok(Object.freeze(points));
};
