import { type Brand, err, ok, type KernelResult } from "@paideia/shared";

/**
 * @paideia/immunology — Deterministic immunology primitives.
 *
 * Antigen-antibody epitope match affinity, Hill-form vaccine booster
 * response, exponential immunity waning, and SIR-compatible effective
 * reproduction number and herd-immunity threshold. Closed-form helpers
 * only; no ODE integration, no stochastic clonal selection, no contact-
 * network heterogeneity.
 */

export type EpitopeSequence = Brand<string, "EpitopeSequence">;
export type AffinityScore = Brand<number, "AffinityScore_0_1">;
export type ImmunityLevel = Brand<number, "ImmunityLevel_0_1">;
export type DoseAmount = Brand<number, "DoseAmount_nonneg">;
export type DecayRate = Brand<number, "DecayRate_per_day_nonneg">;
export type ReproductionNumber = Brand<number, "ReproductionNumber_nonneg">;

export interface BoosterInput {
  readonly previousImmunity: ImmunityLevel;
  readonly doseSize: DoseAmount;
  readonly halfMaxDose: DoseAmount;
  readonly hillCoefficient: number;
}

export interface WaningInput {
  readonly immunity: ImmunityLevel;
  readonly decayRate: DecayRate;
  readonly days: number;
}

export interface HerdImmunityInput {
  readonly baseR0: ReproductionNumber;
  readonly immunityFraction: ImmunityLevel;
}

const EPITOPE_LETTERS = new Set<string>([
  "A", "C", "D", "E", "F", "G", "H", "I", "K", "L",
  "M", "N", "P", "Q", "R", "S", "T", "U", "V", "W", "Y",
]);

// ──────────────────────────────────────────────────────────────────────────
// Constructors
// ──────────────────────────────────────────────────────────────────────────

const requireFinite = (
  value: number,
  label: string,
): KernelResult<number> =>
  typeof value === "number" && Number.isFinite(value)
    ? ok(value)
    : err(
        "precondition-violated",
        `${label} must be a finite number; got ${String(value)}.`,
      );

const requireUnitInterval = (
  value: number,
  label: string,
): KernelResult<number> => {
  const finite = requireFinite(value, label);
  if (!finite.ok) return finite;
  if (finite.value < 0 || finite.value > 1) {
    return err(
      "out-of-domain",
      `${label} must lie in [0, 1]; got ${finite.value}.`,
    );
  }
  return ok(finite.value);
};

const requireNonNegative = (
  value: number,
  label: string,
): KernelResult<number> => {
  const finite = requireFinite(value, label);
  if (!finite.ok) return finite;
  if (finite.value < 0) {
    return err(
      "out-of-domain",
      `${label} must be non-negative; got ${finite.value}.`,
    );
  }
  return ok(finite.value);
};

const requirePositive = (
  value: number,
  label: string,
): KernelResult<number> => {
  const non = requireNonNegative(value, label);
  if (!non.ok) return non;
  if (non.value === 0) {
    return err("out-of-domain", `${label} must be strictly positive; got 0.`);
  }
  return ok(non.value);
};

export const epitopeSequence = (
  value: string,
): KernelResult<EpitopeSequence> => {
  if (typeof value !== "string") {
    return err("precondition-violated", "EpitopeSequence must be a string.");
  }
  if (value.length === 0) {
    return err("precondition-violated", "EpitopeSequence must not be empty.");
  }
  if (value.length > 64) {
    return err(
      "out-of-domain",
      `EpitopeSequence length must be <= 64; got ${value.length}.`,
    );
  }
  const upper = value.toUpperCase();
  for (let i = 0; i < upper.length; i += 1) {
    const letter = upper.charAt(i);
    if (!EPITOPE_LETTERS.has(letter)) {
      return err(
        "out-of-domain",
        `EpitopeSequence contains invalid letter "${value.charAt(i)}" at position ${i}.`,
      );
    }
  }
  return ok(upper as EpitopeSequence);
};

export const affinityScore = (value: number): KernelResult<AffinityScore> => {
  const r = requireUnitInterval(value, "AffinityScore");
  return r.ok ? ok(r.value as AffinityScore) : r;
};

export const immunityLevel = (value: number): KernelResult<ImmunityLevel> => {
  const r = requireUnitInterval(value, "ImmunityLevel");
  return r.ok ? ok(r.value as ImmunityLevel) : r;
};

export const doseAmount = (value: number): KernelResult<DoseAmount> => {
  const r = requireNonNegative(value, "DoseAmount");
  return r.ok ? ok(r.value as DoseAmount) : r;
};

export const decayRate = (value: number): KernelResult<DecayRate> => {
  const r = requireNonNegative(value, "DecayRate");
  return r.ok ? ok(r.value as DecayRate) : r;
};

export const reproductionNumber = (
  value: number,
): KernelResult<ReproductionNumber> => {
  const r = requireNonNegative(value, "ReproductionNumber");
  return r.ok ? ok(r.value as ReproductionNumber) : r;
};

// ──────────────────────────────────────────────────────────────────────────
// Antigen-antibody match
// ──────────────────────────────────────────────────────────────────────────

export const matchAffinity = (
  antigen: EpitopeSequence,
  antibody: EpitopeSequence,
): KernelResult<AffinityScore> => {
  const aRaw = antigen as unknown as string;
  const bRaw = antibody as unknown as string;
  if (typeof aRaw !== "string" || typeof bRaw !== "string") {
    return err(
      "precondition-violated",
      "Antigen and antibody must be string brands.",
    );
  }
  if (aRaw.length !== bRaw.length) {
    return err(
      "out-of-domain",
      `Antigen and antibody must have equal length; got ${aRaw.length} and ${bRaw.length}.`,
    );
  }
  if (aRaw.length === 0) {
    return err(
      "precondition-violated",
      "Antigen and antibody must be non-empty.",
    );
  }
  let matches = 0;
  for (let i = 0; i < aRaw.length; i += 1) {
    if (aRaw.charAt(i) === bRaw.charAt(i)) matches += 1;
  }
  const score = matches / aRaw.length;
  return ok(score as AffinityScore);
};

// ──────────────────────────────────────────────────────────────────────────
// Booster, waning, and effective R
// ──────────────────────────────────────────────────────────────────────────

const clamp01 = (value: number): number =>
  value < 0 ? 0 : value > 1 ? 1 : value;

export const boosterResponse = (
  input: BoosterInput,
): KernelResult<ImmunityLevel> => {
  const prev = requireUnitInterval(
    input.previousImmunity as unknown as number,
    "previousImmunity",
  );
  if (!prev.ok) return prev;
  const dose = requireNonNegative(
    input.doseSize as unknown as number,
    "doseSize",
  );
  if (!dose.ok) return dose;
  const half = requirePositive(
    input.halfMaxDose as unknown as number,
    "halfMaxDose",
  );
  if (!half.ok) return half;
  const n = requirePositive(input.hillCoefficient, "hillCoefficient");
  if (!n.ok) return n;
  if (dose.value === 0) {
    return ok(prev.value as ImmunityLevel);
  }
  const dosePow = Math.pow(dose.value, n.value);
  const halfPow = Math.pow(half.value, n.value);
  const denominator = halfPow + dosePow;
  if (denominator <= 0) {
    return err(
      "numerical-instability",
      "Booster Hill denominator collapsed to non-positive.",
    );
  }
  const boost = dosePow / denominator; // [0, 1)
  const next = 1 - (1 - prev.value) * (1 - boost);
  if (!Number.isFinite(next)) {
    return err(
      "numerical-instability",
      "Booster response produced a non-finite value.",
    );
  }
  return ok(clamp01(next) as ImmunityLevel);
};

export const waneImmunity = (
  input: WaningInput,
): KernelResult<ImmunityLevel> => {
  const i = requireUnitInterval(
    input.immunity as unknown as number,
    "immunity",
  );
  if (!i.ok) return i;
  const lambda = requireNonNegative(
    input.decayRate as unknown as number,
    "decayRate",
  );
  if (!lambda.ok) return lambda;
  const d = requireNonNegative(input.days, "days");
  if (!d.ok) return d;
  const next = i.value * Math.exp(-lambda.value * d.value);
  if (!Number.isFinite(next)) {
    return err(
      "numerical-instability",
      "Waning immunity produced a non-finite value.",
    );
  }
  return ok(clamp01(next) as ImmunityLevel);
};

export const effectiveReproductionNumber = (
  input: HerdImmunityInput,
): KernelResult<ReproductionNumber> => {
  const r0 = requireNonNegative(
    input.baseR0 as unknown as number,
    "baseR0",
  );
  if (!r0.ok) return r0;
  const p = requireUnitInterval(
    input.immunityFraction as unknown as number,
    "immunityFraction",
  );
  if (!p.ok) return p;
  const re = r0.value * (1 - p.value);
  if (!Number.isFinite(re)) {
    return err(
      "numerical-instability",
      "Effective R produced a non-finite value.",
    );
  }
  return ok(Math.max(0, re) as ReproductionNumber);
};

export const herdImmunityThreshold = (
  baseR0: ReproductionNumber,
): KernelResult<ImmunityLevel> => {
  const r0 = requireNonNegative(baseR0 as unknown as number, "baseR0");
  if (!r0.ok) return r0;
  if (r0.value <= 1) {
    return err(
      "out-of-domain",
      `herdImmunityThreshold requires baseR0 > 1; got ${r0.value}.`,
    );
  }
  const threshold = 1 - 1 / r0.value;
  return ok(clamp01(threshold) as ImmunityLevel);
};
