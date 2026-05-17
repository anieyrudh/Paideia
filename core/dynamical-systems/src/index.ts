import { err, ok, type KernelResult } from "@paideia/shared";

export const dynamicalSystemTolerance = {
  default: 1e-7,
  loose: 1e-5,
  jacobian: 1e-6,
} as const;

export type StateVector = readonly number[];
export type VectorField = (state: StateVector, t: number) => StateVector;
export type StateMap = (state: StateVector, stepIndex: number) => StateVector;
export type IntegrationMethod = "euler" | "midpoint" | "rk4";

export interface TrajectoryPoint {
  readonly t: number;
  readonly state: StateVector;
}

export interface OrbitPoint {
  readonly step: number;
  readonly state: StateVector;
}

export type Matrix2x2 = readonly [readonly [number, number], readonly [number, number]];

export type Eigenvalue2D =
  | { readonly kind: "real"; readonly lambda1: number; readonly lambda2: number }
  | { readonly kind: "complex"; readonly real: number; readonly imaginaryMagnitude: number };

export type EquilibriumKind =
  | "stable-node"
  | "unstable-node"
  | "saddle"
  | "stable-spiral"
  | "unstable-spiral"
  | "center"
  | "degenerate";

export interface LinearStability2D {
  readonly trace: number;
  readonly determinant: number;
  readonly discriminant: number;
  readonly eigenvalues: Eigenvalue2D;
  readonly kind: EquilibriumKind;
}

interface StepOptions {
  readonly dt: number;
  readonly t?: number;
  readonly method?: IntegrationMethod;
  readonly maxNorm?: number;
}

interface IntegrationOptions {
  readonly dt: number;
  readonly steps: number;
  readonly t0?: number;
  readonly method?: IntegrationMethod;
  readonly maxNorm?: number;
}

interface MapIterationOptions {
  readonly steps: number;
  readonly maxNorm?: number;
}

interface JacobianOptions {
  readonly t?: number;
  readonly h?: number;
}

const defaultMaxNorm = 1e9;
const equilibriumTolerance = 1e-10;

const freezeVector = (state: readonly number[]): StateVector => Object.freeze([...state]);

const freezePoint = (point: TrajectoryPoint): TrajectoryPoint =>
  Object.freeze({ t: point.t, state: point.state });

const freezeOrbitPoint = (point: OrbitPoint): OrbitPoint =>
  Object.freeze({ step: point.step, state: point.state });

const vectorNorm = (state: StateVector): number => Math.hypot(...state);

const validateFiniteState = (state: StateVector, label: string): KernelResult<void> => {
  if (state.length === 0) {
    return err("precondition-violated", `${label} must contain at least one coordinate`);
  }

  for (let index = 0; index < state.length; index += 1) {
    const value = state[index];
    if (value === undefined || !Number.isFinite(value)) {
      return err("precondition-violated", `${label}[${index}] must be finite; got ${value}`);
    }
  }

  return ok(undefined);
};

const validateBoundedState = (
  state: StateVector,
  label: string,
  maxNorm: number,
): KernelResult<void> => {
  const finite = validateFiniteState(state, label);
  if (!finite.ok) return finite;

  const norm = vectorNorm(state);
  if (!Number.isFinite(norm) || norm > maxNorm) {
    return err(
      "numerical-instability",
      `${label} norm must remain finite and <= ${maxNorm}; got ${norm}`,
    );
  }

  return ok(undefined);
};

const validateMaxNorm = (value: number | undefined): KernelResult<number> => {
  const maxNorm = value ?? defaultMaxNorm;
  return Number.isFinite(maxNorm) && maxNorm > 0
    ? ok(maxNorm)
    : err("precondition-violated", `maxNorm must be a positive finite number; got ${maxNorm}`);
};

const validateStepCount = (steps: number): KernelResult<void> =>
  Number.isInteger(steps) && steps >= 0
    ? ok(undefined)
    : err("precondition-violated", `steps must be a non-negative integer; got ${steps}`);

const validateDt = (dt: number): KernelResult<void> =>
  Number.isFinite(dt) && dt !== 0
    ? ok(undefined)
    : err("precondition-violated", `dt must be finite and non-zero; got ${dt}`);

const validateTime = (t: number): KernelResult<void> =>
  Number.isFinite(t) ? ok(undefined) : err("precondition-violated", `t must be finite; got ${t}`);

const validateFiniteDerivedNumber = (value: number, label: string): KernelResult<void> =>
  Number.isFinite(value)
    ? ok(undefined)
    : err("numerical-instability", `${label} must be finite; got ${value}`);

const addScaled = (state: StateVector, derivative: StateVector, scale: number): StateVector =>
  freezeVector(state.map((value, index) => value + scale * (derivative[index] ?? 0)));

const weightedSum = (
  state: StateVector,
  weights: readonly (readonly [StateVector, number])[],
  dt: number,
): StateVector =>
  freezeVector(
    state.map((value, index) => {
      let delta = 0;
      for (const [derivative, weight] of weights) {
        delta += weight * (derivative[index] ?? 0);
      }
      return value + dt * delta;
    }),
  );

const evaluateVectorField = (
  field: VectorField,
  state: StateVector,
  t: number,
  expectedDimension: number,
): KernelResult<StateVector> => {
  try {
    const derivative = freezeVector(field(state, t));
    if (derivative.length !== expectedDimension) {
      return err(
        "precondition-violated",
        `Vector field returned dimension ${derivative.length}; expected ${expectedDimension}`,
      );
    }

    const finite = validateFiniteState(derivative, "derivative");
    return finite.ok ? ok(derivative) : finite;
  } catch (cause) {
    return err("undefined-at-point", `Vector field threw at t=${t}`, cause);
  }
};

const evaluateMap = (
  map: StateMap,
  state: StateVector,
  stepIndex: number,
  expectedDimension: number,
): KernelResult<StateVector> => {
  try {
    const next = freezeVector(map(state, stepIndex));
    if (next.length !== expectedDimension) {
      return err(
        "precondition-violated",
        `State map returned dimension ${next.length}; expected ${expectedDimension}`,
      );
    }

    const finite = validateFiniteState(next, "mapped state");
    return finite.ok ? ok(next) : finite;
  } catch (cause) {
    return err("undefined-at-point", `State map threw at step ${stepIndex}`, cause);
  }
};

const stepEuler = (
  field: VectorField,
  state: StateVector,
  t: number,
  dt: number,
): KernelResult<StateVector> => {
  const k1 = evaluateVectorField(field, state, t, state.length);
  return k1.ok ? ok(addScaled(state, k1.value, dt)) : k1;
};

const stepMidpoint = (
  field: VectorField,
  state: StateVector,
  t: number,
  dt: number,
): KernelResult<StateVector> => {
  const k1 = evaluateVectorField(field, state, t, state.length);
  if (!k1.ok) return k1;

  const midpoint = addScaled(state, k1.value, dt / 2);
  const k2 = evaluateVectorField(field, midpoint, t + dt / 2, state.length);
  return k2.ok ? ok(addScaled(state, k2.value, dt)) : k2;
};

const stepRk4 = (
  field: VectorField,
  state: StateVector,
  t: number,
  dt: number,
): KernelResult<StateVector> => {
  const k1 = evaluateVectorField(field, state, t, state.length);
  if (!k1.ok) return k1;

  const k2State = addScaled(state, k1.value, dt / 2);
  const k2 = evaluateVectorField(field, k2State, t + dt / 2, state.length);
  if (!k2.ok) return k2;

  const k3State = addScaled(state, k2.value, dt / 2);
  const k3 = evaluateVectorField(field, k3State, t + dt / 2, state.length);
  if (!k3.ok) return k3;

  const k4State = addScaled(state, k3.value, dt);
  const k4 = evaluateVectorField(field, k4State, t + dt, state.length);
  if (!k4.ok) return k4;

  return ok(
    weightedSum(
      state,
      [
        [k1.value, 1 / 6],
        [k2.value, 1 / 3],
        [k3.value, 1 / 3],
        [k4.value, 1 / 6],
      ],
      dt,
    ),
  );
};

export const stepFlow = (
  field: VectorField,
  state: StateVector,
  opts: StepOptions,
): KernelResult<StateVector> => {
  const finiteState = validateFiniteState(state, "state");
  if (!finiteState.ok) return finiteState;

  const validDt = validateDt(opts.dt);
  if (!validDt.ok) return validDt;

  const t = opts.t ?? 0;
  const validTime = validateTime(t);
  if (!validTime.ok) return validTime;

  const maxNorm = validateMaxNorm(opts.maxNorm);
  if (!maxNorm.ok) return maxNorm;

  const start = freezeVector(state);
  const boundedStart = validateBoundedState(start, "state", maxNorm.value);
  if (!boundedStart.ok) return boundedStart;

  const method = opts.method ?? "rk4";
  const next = (() => {
    switch (method) {
      case "euler":
        return stepEuler(field, start, t, opts.dt);
      case "midpoint":
        return stepMidpoint(field, start, t, opts.dt);
      case "rk4":
        return stepRk4(field, start, t, opts.dt);
      default:
        return err("precondition-violated", `Unknown integration method: ${String(method)}`);
    }
  })();

  if (!next.ok) return next;
  const boundedNext = validateBoundedState(next.value, "next state", maxNorm.value);
  return boundedNext.ok ? next : boundedNext;
};

export const integrateFlow = (
  field: VectorField,
  initialState: StateVector,
  opts: IntegrationOptions,
): KernelResult<readonly TrajectoryPoint[]> => {
  const finiteState = validateFiniteState(initialState, "initialState");
  if (!finiteState.ok) return finiteState;

  const validSteps = validateStepCount(opts.steps);
  if (!validSteps.ok) return validSteps;

  const validDt = validateDt(opts.dt);
  if (!validDt.ok) return validDt;

  const t0 = opts.t0 ?? 0;
  const validTime = validateTime(t0);
  if (!validTime.ok) return validTime;

  const maxNorm = validateMaxNorm(opts.maxNorm);
  if (!maxNorm.ok) return maxNorm;

  let current = freezeVector(initialState);
  const boundedStart = validateBoundedState(current, "initialState", maxNorm.value);
  if (!boundedStart.ok) return boundedStart;

  const trajectory: TrajectoryPoint[] = [freezePoint({ t: t0, state: current })];
  for (let step = 0; step < opts.steps; step += 1) {
    const t = t0 + step * opts.dt;
    const next = stepFlow(field, current, {
      dt: opts.dt,
      t,
      ...(opts.method !== undefined && { method: opts.method }),
      maxNorm: maxNorm.value,
    });
    if (!next.ok) return next;
    current = next.value;
    trajectory.push(freezePoint({ t: t + opts.dt, state: current }));
  }

  return ok(Object.freeze(trajectory));
};

export const iterateMap = (
  map: StateMap,
  initialState: StateVector,
  opts: MapIterationOptions,
): KernelResult<readonly OrbitPoint[]> => {
  const finiteState = validateFiniteState(initialState, "initialState");
  if (!finiteState.ok) return finiteState;

  const validSteps = validateStepCount(opts.steps);
  if (!validSteps.ok) return validSteps;

  const maxNorm = validateMaxNorm(opts.maxNorm);
  if (!maxNorm.ok) return maxNorm;

  let current = freezeVector(initialState);
  const boundedStart = validateBoundedState(current, "initialState", maxNorm.value);
  if (!boundedStart.ok) return boundedStart;

  const orbit: OrbitPoint[] = [freezeOrbitPoint({ step: 0, state: current })];
  for (let step = 0; step < opts.steps; step += 1) {
    const next = evaluateMap(map, current, step, current.length);
    if (!next.ok) return next;
    const boundedNext = validateBoundedState(next.value, "mapped state", maxNorm.value);
    if (!boundedNext.ok) return boundedNext;
    current = next.value;
    orbit.push(freezeOrbitPoint({ step: step + 1, state: current }));
  }

  return ok(Object.freeze(orbit));
};

const validateJacobianInput = (
  at: readonly [number, number],
  t: number,
  h: number,
): KernelResult<void> => {
  if (!Number.isFinite(at[0]) || !Number.isFinite(at[1])) {
    return err("precondition-violated", `Jacobian point must be finite; got [${at[0]}, ${at[1]}]`);
  }

  const validTime = validateTime(t);
  if (!validTime.ok) return validTime;

  if (!Number.isFinite(h) || h <= 0) {
    return err("precondition-violated", `h must be a positive finite number; got ${h}`);
  }

  if (at[0] + h === at[0] || at[0] - h === at[0] || at[1] + h === at[1] || at[1] - h === at[1]) {
    return err("numerical-instability", `h=${h} is too small for point [${at[0]}, ${at[1]}]`);
  }

  return ok(undefined);
};

export const jacobian2D = (
  field: VectorField,
  at: readonly [number, number],
  opts: JacobianOptions = {},
): KernelResult<Matrix2x2> => {
  const t = opts.t ?? 0;
  const h = opts.h ?? Math.sqrt(Number.EPSILON) * Math.max(1, Math.abs(at[0]), Math.abs(at[1]));
  const validInput = validateJacobianInput(at, t, h);
  if (!validInput.ok) return validInput;

  const xPlus = evaluateVectorField(field, freezeVector([at[0] + h, at[1]]), t, 2);
  if (!xPlus.ok) return xPlus;
  const xMinus = evaluateVectorField(field, freezeVector([at[0] - h, at[1]]), t, 2);
  if (!xMinus.ok) return xMinus;
  const yPlus = evaluateVectorField(field, freezeVector([at[0], at[1] + h]), t, 2);
  if (!yPlus.ok) return yPlus;
  const yMinus = evaluateVectorField(field, freezeVector([at[0], at[1] - h]), t, 2);
  if (!yMinus.ok) return yMinus;

  const row0 = Object.freeze([
    ((xPlus.value[0] ?? 0) - (xMinus.value[0] ?? 0)) / (2 * h),
    ((yPlus.value[0] ?? 0) - (yMinus.value[0] ?? 0)) / (2 * h),
  ] as const);
  const row1 = Object.freeze([
    ((xPlus.value[1] ?? 0) - (xMinus.value[1] ?? 0)) / (2 * h),
    ((yPlus.value[1] ?? 0) - (yMinus.value[1] ?? 0)) / (2 * h),
  ] as const);
  const matrix = Object.freeze([row0, row1] as const);
  const finiteOutput = validateFiniteMatrix2x2(matrix, "Jacobian");
  if (!finiteOutput.ok) return finiteOutput;

  return ok(matrix);
};

const validateFiniteMatrix2x2 = (matrix: Matrix2x2, label: string): KernelResult<void> => {
  for (let row = 0; row < 2; row += 1) {
    for (let column = 0; column < 2; column += 1) {
      const value = matrix[row]?.[column];
      const finite = validateFiniteDerivedNumber(
        value ?? Number.NaN,
        `${label}[${row}][${column}]`,
      );
      if (!finite.ok) return finite;
    }
  }

  return ok(undefined);
};

const validateMatrix2x2 = (matrix: Matrix2x2): KernelResult<void> => {
  for (let row = 0; row < 2; row += 1) {
    for (let column = 0; column < 2; column += 1) {
      const value = matrix[row]?.[column];
      if (!Number.isFinite(value)) {
        return err(
          "precondition-violated",
          `matrix[${row}][${column}] must be finite; got ${value}`,
        );
      }
    }
  }

  return ok(undefined);
};

const finishLinearStability2D = (stability: LinearStability2D): KernelResult<LinearStability2D> => {
  const trace = validateFiniteDerivedNumber(stability.trace, "trace");
  if (!trace.ok) return trace;

  const determinant = validateFiniteDerivedNumber(stability.determinant, "determinant");
  if (!determinant.ok) return determinant;

  const discriminant = validateFiniteDerivedNumber(stability.discriminant, "discriminant");
  if (!discriminant.ok) return discriminant;

  if (stability.eigenvalues.kind === "real") {
    const lambda1 = validateFiniteDerivedNumber(stability.eigenvalues.lambda1, "lambda1");
    if (!lambda1.ok) return lambda1;

    const lambda2 = validateFiniteDerivedNumber(stability.eigenvalues.lambda2, "lambda2");
    if (!lambda2.ok) return lambda2;
  } else {
    const real = validateFiniteDerivedNumber(stability.eigenvalues.real, "real eigenvalue part");
    if (!real.ok) return real;

    const imaginary = validateFiniteDerivedNumber(
      stability.eigenvalues.imaginaryMagnitude,
      "imaginary eigenvalue magnitude",
    );
    if (!imaginary.ok) return imaginary;
  }

  return ok(stability);
};

export const classifyLinear2D = (matrix: Matrix2x2): KernelResult<LinearStability2D> => {
  const validMatrix = validateMatrix2x2(matrix);
  if (!validMatrix.ok) return validMatrix;

  const a = matrix[0][0];
  const b = matrix[0][1];
  const c = matrix[1][0];
  const d = matrix[1][1];
  const trace = a + d;
  const determinant = a * d - b * c;
  const discriminant = trace * trace - 4 * determinant;

  if (Math.abs(determinant) <= equilibriumTolerance || Math.abs(discriminant) <= equilibriumTolerance) {
    const root = trace / 2;
    return finishLinearStability2D({
      trace,
      determinant,
      discriminant,
      eigenvalues: { kind: "real", lambda1: root, lambda2: root },
      kind: "degenerate",
    });
  }

  if (determinant < 0) {
    const root = Math.sqrt(discriminant);
    return finishLinearStability2D({
      trace,
      determinant,
      discriminant,
      eigenvalues: { kind: "real", lambda1: (trace + root) / 2, lambda2: (trace - root) / 2 },
      kind: "saddle",
    });
  }

  if (discriminant > 0) {
    const root = Math.sqrt(discriminant);
    const lambda1 = (trace + root) / 2;
    const lambda2 = (trace - root) / 2;
    return finishLinearStability2D({
      trace,
      determinant,
      discriminant,
      eigenvalues: { kind: "real", lambda1, lambda2 },
      kind: trace < 0 ? "stable-node" : "unstable-node",
    });
  }

  const real = trace / 2;
  const imaginaryMagnitude = Math.sqrt(-discriminant) / 2;
  const kind =
    Math.abs(real) <= equilibriumTolerance
      ? "center"
      : real < 0
        ? "stable-spiral"
        : "unstable-spiral";

  return finishLinearStability2D({
    trace,
    determinant,
    discriminant,
    eigenvalues: { kind: "complex", real, imaginaryMagnitude },
    kind,
  });
};
