/**
 * @paideia/shared — Universal type vocabulary for all of core/.
 *
 * Every core/ kernel and every container consumes types from here.
 * Any breaking change here triggers core-changed.yml (full both-branches CI).
 *
 * Design discipline:
 * - One type per concept. Do not create variant types ("ResultMaybe", "ResultEither").
 * - All numeric kernels accept and return SI units. Express units in type names.
 * - Errors are values (KernelResult<T>), not exceptions, in pure kernel code.
 * - Renderers consume frozen state. Mutation is a P0 violation.
 */

// ──────────────────────────────────────────────────────────────────────────
// Functions
// ──────────────────────────────────────────────────────────────────────────

/** A scalar function of one real variable. Pure. */
export type Function2D = (x: number) => number;

/** A scalar function of two real variables. Pure. */
export type Function3D = (x: number, y: number) => number;

/** A 2D vector field. Returns (vx, vy) at (x, y). Pure. */
export type VectorField2D = (x: number, y: number) => readonly [number, number];

/** A 3D vector field. Returns (vx, vy, vz) at (x, y, z). Pure. */
export type VectorField3D = (
  x: number,
  y: number,
  z: number,
) => readonly [number, number, number];

/** Relative/absolute floating-point comparison for kernel tests and guards. */
export const approxEqual = (
  actual: number,
  expected: number,
  tolerance = 1e-9,
): boolean =>
  Number.isFinite(actual) &&
  Number.isFinite(expected) &&
  Number.isFinite(tolerance) &&
  tolerance >= 0 &&
  Math.abs(actual - expected) <= tolerance * Math.max(1, Math.abs(expected));

/** A parametric curve in 2D. Pure. */
export type ParametricCurve2D = (t: number) => readonly [number, number];

/** A parametric curve in 3D. Pure. */
export type ParametricCurve3D = (t: number) => readonly [number, number, number];

// ──────────────────────────────────────────────────────────────────────────
// Domain bounds
// ──────────────────────────────────────────────────────────────────────────

/** Closed real interval [min, max] with min <= max. */
export interface Interval {
  readonly min: number;
  readonly max: number;
}

/** Rectangle in 2D: x and y intervals. */
export interface Rect {
  readonly x: Interval;
  readonly y: Interval;
}

/** Box in 3D: x, y, z intervals. */
export interface Box3 {
  readonly x: Interval;
  readonly y: Interval;
  readonly z: Interval;
}

/** A value constrained to a closed interval. Construction-time enforced. */
export interface Bounded<T extends number = number> {
  readonly value: T;
  readonly bounds: Interval;
}

// ──────────────────────────────────────────────────────────────────────────
// Result type — kernel errors are values, not exceptions
// ──────────────────────────────────────────────────────────────────────────

/**
 * The universal return type for kernel operations that can fail meaningfully
 * (numerical instability, undefined-at-point, etc.).
 *
 * Kernels NEVER throw on expected failure modes. Throw only on programming
 * bugs (out-of-range index, null where non-null expected).
 */
export type KernelResult<T, E = KernelError> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

/** Standard kernel error shape. Use `code` for programmatic handling, `message` for UI. */
export interface KernelError {
  readonly code: KernelErrorCode;
  readonly message: string;
  readonly cause?: unknown;
}

export type KernelErrorCode =
  | "undefined-at-point" // e.g., 1/x at x=0
  | "numerical-instability" // e.g., derivative h too small
  | "out-of-domain" // input outside declared bounds
  | "convergence-failed" // ODE solver didn't converge
  | "precondition-violated"; // caller violated documented invariant

/** Helper constructors so call sites read naturally. */
export const ok = <T>(value: T): KernelResult<T> => ({ ok: true, value });
export const err = (
  code: KernelErrorCode,
  message: string,
  cause?: unknown,
): KernelResult<never> => ({
  ok: false,
  error: { code, message, ...(cause !== undefined && { cause }) },
});

// ──────────────────────────────────────────────────────────────────────────
// Renderer contract — uniform across all of core/diagram, core/plotting,
// core/charting, core/three-scene, etc.
// ──────────────────────────────────────────────────────────────────────────

/**
 * A renderer accepts frozen state of type T and produces a renderable output.
 * Renderers MUST NOT mutate the state they receive.
 *
 * The output type R is the renderer's concrete output (e.g., a React node,
 * an SVG string, a WebGL draw call). Each core/ render module fixes R.
 */
export type Renderer<T, R> = (state: Readonly<T>) => R;

/**
 * Marker interface: any value passed to a Renderer must be deeply readonly.
 * Use `as const` literals and `readonly` arrays/maps. The boundary CI rejects
 * mutable type signatures crossing renderer arguments.
 */
export type Renderable<T> = Readonly<T>;

// ──────────────────────────────────────────────────────────────────────────
// Units — kernels declare unit-typed parameters where ambiguity would harm
// ──────────────────────────────────────────────────────────────────────────

/**
 * Branded numeric types for unit safety. Use these in public kernel APIs
 * whenever a bare `number` would be ambiguous to the caller.
 *
 * The brand is erased at runtime; this is compile-time discipline only.
 */
export type Brand<T, B extends string> = T & { readonly __brand: B };

export type Seconds = Brand<number, "Seconds">;
export type Metres = Brand<number, "Metres">;
export type Kilograms = Brand<number, "Kilograms">;
export type MetresPerSecond = Brand<number, "MetresPerSecond">;
export type Radians = Brand<number, "Radians">;
export type RadiansPerSecond = Brand<number, "RadiansPerSecond">;
export type Degrees = Brand<number, "Degrees">;
export type Decibels = Brand<number, "Decibels">;
export type Kelvins = Brand<number, "Kelvins">;
export type Newtons = Brand<number, "Newtons">;
export type Joules = Brand<number, "Joules">;
export type Watts = Brand<number, "Watts">;
export type Hertz = Brand<number, "Hertz">;
export type Probability = Brand<number, "Probability">; // [0, 1]

/** Unsafe constructors. Use only at the boundary where the unit is verified. */
export const seconds = (n: number) => n as Seconds;
export const metres = (n: number) => n as Metres;
export const kilograms = (n: number) => n as Kilograms;
export const metresPerSecond = (n: number) => n as MetresPerSecond;
export const radians = (n: number) => n as Radians;
export const radiansPerSecond = (n: number) => n as RadiansPerSecond;
export const degrees = (n: number) => n as Degrees;
export const decibels = (n: number) => n as Decibels;
export const kelvins = (n: number) => n as Kelvins;
export const newtons = (n: number) => n as Newtons;
export const joules = (n: number) => n as Joules;
export const watts = (n: number) => n as Watts;
export const hertz = (n: number) => n as Hertz;
export const probability = (n: number): KernelResult<Probability> =>
  n >= 0 && n <= 1
    ? ok(n as Probability)
    : err("out-of-domain", `Probability must be in [0,1], got ${n}`);

// ──────────────────────────────────────────────────────────────────────────
// Identity types — opaque IDs that don't get confused with each other
// ──────────────────────────────────────────────────────────────────────────

export type ConceptPackageId = Brand<string, "ConceptPackageId">;
export type SimulationId = Brand<string, "SimulationId">;
export type ConceptId = Brand<string, "ConceptId">;
export type StudentId = Brand<string, "StudentId">;
export type AssessmentVariantId = Brand<string, "AssessmentVariantId">;
