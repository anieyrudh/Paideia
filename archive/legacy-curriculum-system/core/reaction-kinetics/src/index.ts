import {
  err,
  ok,
  seconds,
  type Brand,
  type Kelvins,
  type KernelResult,
  type Seconds,
} from "@paideia/shared";

export type ConcentrationMolar = Brand<number, "ReactionKinetics.ConcentrationMolar">;
export type RateConstant = Brand<number, "ReactionKinetics.RateConstant">;
export type ActivationEnergyJoulesPerMole = Brand<
  number,
  "ReactionKinetics.ActivationEnergyJoulesPerMole"
>;

export type ReactionOrder = 0 | 1 | 2;

export interface RateLawInput {
  readonly order: ReactionOrder;
  readonly initialConcentration: ConcentrationMolar;
  readonly rateConstant: RateConstant;
  readonly elapsedSeconds: Seconds;
}

export interface HalfLifeInput {
  readonly order: ReactionOrder;
  readonly initialConcentration: ConcentrationMolar;
  readonly rateConstant: RateConstant;
}

export interface ConcentrationPoint {
  readonly timeSeconds: Seconds;
  readonly concentration: ConcentrationMolar;
}

export interface ConcentrationSeriesInput {
  readonly order: ReactionOrder;
  readonly initialConcentration: ConcentrationMolar;
  readonly rateConstant: RateConstant;
  readonly endSeconds: Seconds;
  readonly sampleCount: number;
  readonly startSeconds?: Seconds;
}

export interface ArrheniusRateRatioInput {
  readonly activationEnergyJoulesPerMole: ActivationEnergyJoulesPerMole;
  readonly initialTemperatureKelvins: Kelvins;
  readonly finalTemperatureKelvins: Kelvins;
}

const gasConstantJoulesPerMoleKelvin = 8.31446261815324;

export const concentrationMolar = (
  value: number,
): KernelResult<ConcentrationMolar> => {
  if (!Number.isFinite(value) || value < 0) {
    return err(
      "out-of-domain",
      `concentrationMolar must be finite and non-negative, got ${value}`,
    );
  }
  return ok(value as ConcentrationMolar);
};

export const rateConstant = (value: number): KernelResult<RateConstant> => {
  if (!Number.isFinite(value) || value < 0) {
    return err(
      "out-of-domain",
      `rateConstant must be finite and non-negative, got ${value}`,
    );
  }
  return ok(value as RateConstant);
};

export const activationEnergyJoulesPerMole = (
  value: number,
): KernelResult<ActivationEnergyJoulesPerMole> => {
  if (!Number.isFinite(value) || value < 0) {
    return err(
      "out-of-domain",
      `activationEnergyJoulesPerMole must be finite and non-negative, got ${value}`,
    );
  }
  return ok(value as ActivationEnergyJoulesPerMole);
};

export const concentrationAtTime = (
  input: RateLawInput,
): KernelResult<ConcentrationMolar> => {
  const valid = validateRateLawInput(input);
  if (!valid.ok) {
    return valid;
  }

  const initial = Number(input.initialConcentration);
  const k = Number(input.rateConstant);
  const elapsed = Number(input.elapsedSeconds);

  const concentration =
    input.order === 0
      ? Math.max(0, initial - k * elapsed)
      : input.order === 1
        ? initial * Math.exp(-k * elapsed)
        : initial / (1 + k * initial * elapsed);

  if (!Number.isFinite(concentration)) {
    return err(
      "numerical-instability",
      "concentration calculation overflowed the finite-number model",
    );
  }
  return ok(concentration as ConcentrationMolar);
};

export const halfLife = (input: HalfLifeInput): KernelResult<Seconds> => {
  const validOrder = validateOrder(input.order);
  if (!validOrder.ok) {
    return validOrder;
  }
  const validInitial = concentrationMolar(input.initialConcentration);
  if (!validInitial.ok) {
    return validInitial;
  }
  const validRate = rateConstant(input.rateConstant);
  if (!validRate.ok) {
    return validRate;
  }
  const initial = Number(validInitial.value);
  const k = Number(validRate.value);
  if (initial <= 0) {
    return err(
      "precondition-violated",
      "halfLife requires positive initialConcentration",
    );
  }
  if (k <= 0) {
    return err("precondition-violated", "halfLife requires positive rateConstant");
  }

  const value =
    input.order === 0 ? initial / (2 * k) : input.order === 1 ? Math.LN2 / k : 1 / (k * initial);
  if (!Number.isFinite(value)) {
    return err("numerical-instability", "halfLife overflowed the finite-number model");
  }
  return ok(seconds(value));
};

export const sampleConcentrationSeries = (
  input: ConcentrationSeriesInput,
): KernelResult<readonly ConcentrationPoint[]> => {
  const sampleCount = input.sampleCount;
  if (!Number.isInteger(sampleCount) || sampleCount < 2) {
    return err(
      "precondition-violated",
      `sampleCount must be an integer >= 2, got ${sampleCount}`,
    );
  }

  const start = input.startSeconds ?? seconds(0);
  const validStart = validateNonNegativeFiniteSeconds(start, "startSeconds");
  if (!validStart.ok) {
    return validStart;
  }
  const validEnd = validateNonNegativeFiniteSeconds(input.endSeconds, "endSeconds");
  if (!validEnd.ok) {
    return validEnd;
  }
  if (Number(start) > Number(input.endSeconds)) {
    return err(
      "precondition-violated",
      "startSeconds must be less than or equal to endSeconds",
    );
  }

  const validRateLaw = validateRateLawInput({
    order: input.order,
    initialConcentration: input.initialConcentration,
    rateConstant: input.rateConstant,
    elapsedSeconds: start,
  });
  if (!validRateLaw.ok) {
    return validRateLaw;
  }

  const span = Number(input.endSeconds) - Number(start);
  const points: ConcentrationPoint[] = [];
  for (let index = 0; index < sampleCount; index += 1) {
    const time = Number(start) + (span * index) / (sampleCount - 1);
    const concentration = concentrationAtTime({
      order: input.order,
      initialConcentration: input.initialConcentration,
      rateConstant: input.rateConstant,
      elapsedSeconds: seconds(time),
    });
    if (!concentration.ok) {
      return concentration;
    }
    points.push(
      Object.freeze({
        timeSeconds: seconds(time),
        concentration: concentration.value,
      }),
    );
  }
  return ok(Object.freeze(points));
};

export const arrheniusRateRatio = (
  input: ArrheniusRateRatioInput,
): KernelResult<number> => {
  const validEnergy = activationEnergyJoulesPerMole(
    input.activationEnergyJoulesPerMole,
  );
  if (!validEnergy.ok) {
    return validEnergy;
  }
  const validInitialTemperature = validatePositiveFiniteKelvins(
    input.initialTemperatureKelvins,
    "initialTemperatureKelvins",
  );
  if (!validInitialTemperature.ok) {
    return validInitialTemperature;
  }
  const validFinalTemperature = validatePositiveFiniteKelvins(
    input.finalTemperatureKelvins,
    "finalTemperatureKelvins",
  );
  if (!validFinalTemperature.ok) {
    return validFinalTemperature;
  }

  const exponent =
    (Number(validEnergy.value) / gasConstantJoulesPerMoleKelvin) *
    (1 / Number(input.initialTemperatureKelvins) - 1 / Number(input.finalTemperatureKelvins));
  const ratio = Math.exp(exponent);
  if (!Number.isFinite(ratio)) {
    return err(
      "numerical-instability",
      "Arrhenius rate ratio overflowed the finite-number model",
    );
  }
  return ok(ratio);
};

const validateRateLawInput = (
  input: RateLawInput,
): KernelResult<true> => {
  const validOrder = validateOrder(input.order);
  if (!validOrder.ok) {
    return validOrder;
  }
  const validInitial = concentrationMolar(input.initialConcentration);
  if (!validInitial.ok) {
    return validInitial;
  }
  const validRate = rateConstant(input.rateConstant);
  if (!validRate.ok) {
    return validRate;
  }
  const validElapsed = validateNonNegativeFiniteSeconds(
    input.elapsedSeconds,
    "elapsedSeconds",
  );
  if (!validElapsed.ok) {
    return validElapsed;
  }
  return ok(true);
};

const validateOrder = (order: ReactionOrder): KernelResult<true> => {
  if (order !== 0 && order !== 1 && order !== 2) {
    return err(
      "precondition-violated",
      `order must be exactly 0, 1, or 2, got ${order}`,
    );
  }
  return ok(true);
};

const validateNonNegativeFiniteSeconds = (
  value: Seconds,
  label: string,
): KernelResult<true> => {
  if (!Number.isFinite(value) || value < 0) {
    return err("out-of-domain", `${label} must be finite and non-negative, got ${value}`);
  }
  return ok(true);
};

const validatePositiveFiniteKelvins = (
  value: Kelvins,
  label: string,
): KernelResult<true> => {
  if (!Number.isFinite(value) || value <= 0) {
    return err("out-of-domain", `${label} must be finite and positive, got ${value}`);
  }
  return ok(true);
};
