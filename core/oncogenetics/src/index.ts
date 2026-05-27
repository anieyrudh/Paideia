import { type Brand, err, ok, type KernelResult } from "@paideia/shared";

/**
 * @paideia/oncogenetics — Deterministic clonal-evolution primitives.
 *
 * Driver / passenger mutation bookkeeping, the (1 + s)^k relative-fitness
 * rule, a multi-hit probability approximation, and closed-form clonal-growth
 * after N generations. Stochastic Moran / Wright-Fisher dynamics, full
 * Knudson age-incidence integration, and clinical recommendations are out of
 * scope.
 */

export type MutationCount = Brand<number, "MutationCount_nonneg_int">;
export type FitnessAdvantage = Brand<number, "FitnessAdvantage_nonneg">;
export type MutationRatePerCellDivision = Brand<number, "MutationRate_0_1">;
export type CellPopulationSize = Brand<number, "CellPopulationSize_nonneg">;
export type RelativeFitness = Brand<number, "RelativeFitness_atLeast_1">;
export type HitProbability = Brand<number, "HitProbability_0_1">;

export interface CloneState {
  readonly drivers: MutationCount;
  readonly passengers: MutationCount;
  readonly size: CellPopulationSize;
}

export interface MultiHitInput {
  readonly populationSize: CellPopulationSize;
  readonly mutationRate: MutationRatePerCellDivision;
  readonly requiredDriverHits: MutationCount;
  readonly generations: number;
}

export interface ClonalGrowthInput {
  readonly clone: CloneState;
  readonly perDriverAdvantage: FitnessAdvantage;
  readonly generations: number;
}

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

const requireNonNegativeInteger = (
  value: number,
  label: string,
): KernelResult<number> => {
  const finite = requireFinite(value, label);
  if (!finite.ok) return finite;
  if (!Number.isInteger(finite.value)) {
    return err(
      "precondition-violated",
      `${label} must be an integer; got ${finite.value}.`,
    );
  }
  if (finite.value < 0) {
    return err(
      "out-of-domain",
      `${label} must be non-negative; got ${finite.value}.`,
    );
  }
  return ok(finite.value);
};

export const mutationCount = (value: number): KernelResult<MutationCount> => {
  const r = requireNonNegativeInteger(value, "MutationCount");
  return r.ok ? ok(r.value as MutationCount) : r;
};

export const fitnessAdvantage = (
  value: number,
): KernelResult<FitnessAdvantage> => {
  const r = requireNonNegative(value, "FitnessAdvantage");
  return r.ok ? ok(r.value as FitnessAdvantage) : r;
};

export const mutationRate = (
  value: number,
): KernelResult<MutationRatePerCellDivision> => {
  const r = requireUnitInterval(value, "MutationRatePerCellDivision");
  return r.ok ? ok(r.value as MutationRatePerCellDivision) : r;
};

export const cellPopulationSize = (
  value: number,
): KernelResult<CellPopulationSize> => {
  const r = requireNonNegative(value, "CellPopulationSize");
  return r.ok ? ok(r.value as CellPopulationSize) : r;
};

// ──────────────────────────────────────────────────────────────────────────
// Operations
// ──────────────────────────────────────────────────────────────────────────

const ensureFinite = (
  value: number,
  label: string,
): KernelResult<number> =>
  Number.isFinite(value)
    ? ok(value)
    : err(
        "numerical-instability",
        `${label} produced a non-finite result (${String(value)}).`,
      );

const clamp01 = (value: number): number =>
  value < 0 ? 0 : value > 1 ? 1 : value;

export const relativeFitness = (
  drivers: MutationCount,
  perDriver: FitnessAdvantage,
): KernelResult<RelativeFitness> => {
  const k = requireNonNegativeInteger(
    drivers as unknown as number,
    "drivers",
  );
  if (!k.ok) return k;
  const s = requireNonNegative(
    perDriver as unknown as number,
    "perDriverAdvantage",
  );
  if (!s.ok) return s;
  const fitness = Math.pow(1 + s.value, k.value);
  const finite = ensureFinite(fitness, "relativeFitness");
  if (!finite.ok) return finite;
  if (finite.value < 1) {
    return err(
      "numerical-instability",
      `relativeFitness must be >= 1; got ${finite.value}.`,
    );
  }
  return ok(finite.value as RelativeFitness);
};

export const multiHitProbability = (
  input: MultiHitInput,
): KernelResult<HitProbability> => {
  const n = requireNonNegative(
    input.populationSize as unknown as number,
    "populationSize",
  );
  if (!n.ok) return n;
  const mu = requireUnitInterval(
    input.mutationRate as unknown as number,
    "mutationRate",
  );
  if (!mu.ok) return mu;
  const k = requireNonNegativeInteger(
    input.requiredDriverHits as unknown as number,
    "requiredDriverHits",
  );
  if (!k.ok) return k;
  const g = requireNonNegative(input.generations, "generations");
  if (!g.ok) return g;
  if (k.value === 0) {
    return err(
      "precondition-violated",
      "requiredDriverHits must be >= 1.",
    );
  }
  if (n.value === 0 || g.value === 0) {
    return ok(0 as HitProbability);
  }
  const perCellPerGeneration = Math.pow(mu.value, k.value);
  if (perCellPerGeneration <= 0) {
    return ok(0 as HitProbability);
  }
  const trials = n.value * g.value;
  // 1 - (1 - p)^trials. Numerically: use expm1/log1p when (1 - p) is close to 1.
  const oneMinusP = 1 - perCellPerGeneration;
  let prob: number;
  if (oneMinusP <= 0) {
    prob = 1;
  } else {
    // exp(trials * log(oneMinusP)) is more accurate than (oneMinusP)**trials
    // for small p.
    const logTerm = Math.log(oneMinusP);
    prob = 1 - Math.exp(trials * logTerm);
  }
  const finite = ensureFinite(prob, "multiHitProbability");
  if (!finite.ok) return finite;
  return ok(clamp01(finite.value) as HitProbability);
};

const requireClone = (clone: CloneState): KernelResult<CloneState> => {
  const drivers = requireNonNegativeInteger(
    clone.drivers as unknown as number,
    "clone.drivers",
  );
  if (!drivers.ok) return drivers;
  const passengers = requireNonNegativeInteger(
    clone.passengers as unknown as number,
    "clone.passengers",
  );
  if (!passengers.ok) return passengers;
  const size = requireNonNegative(
    clone.size as unknown as number,
    "clone.size",
  );
  if (!size.ok) return size;
  return ok({
    drivers: drivers.value as MutationCount,
    passengers: passengers.value as MutationCount,
    size: size.value as CellPopulationSize,
  });
};

export const clonalGrowthAfterGenerations = (
  input: ClonalGrowthInput,
): KernelResult<CellPopulationSize> => {
  const clone = requireClone(input.clone);
  if (!clone.ok) return clone;
  const s = requireNonNegative(
    input.perDriverAdvantage as unknown as number,
    "perDriverAdvantage",
  );
  if (!s.ok) return s;
  const g = requireNonNegative(input.generations, "generations");
  if (!g.ok) return g;
  const fitness = relativeFitness(
    clone.value.drivers,
    s.value as FitnessAdvantage,
  );
  if (!fitness.ok) return fitness;
  const next =
    (clone.value.size as unknown as number) *
    Math.pow(fitness.value as unknown as number, g.value);
  const finite = ensureFinite(next, "clonalGrowthAfterGenerations");
  if (!finite.ok) return finite;
  return ok(Math.max(0, finite.value) as CellPopulationSize);
};

export interface CompareClonalGrowthResult {
  readonly aSize: CellPopulationSize;
  readonly bSize: CellPopulationSize;
  readonly ratio: number;
}

export const compareClonalGrowth = (
  a: ClonalGrowthInput,
  b: ClonalGrowthInput,
): KernelResult<CompareClonalGrowthResult> => {
  const aSize = clonalGrowthAfterGenerations(a);
  if (!aSize.ok) return aSize;
  const bSize = clonalGrowthAfterGenerations(b);
  if (!bSize.ok) return bSize;
  const bRaw = bSize.value as unknown as number;
  if (bRaw <= 0) {
    return err(
      "out-of-domain",
      `compareClonalGrowth requires the reference clone (b) to have positive size; got ${bRaw}.`,
    );
  }
  const ratio = (aSize.value as unknown as number) / bRaw;
  const finite = ensureFinite(ratio, "compareClonalGrowth.ratio");
  if (!finite.ok) return finite;
  return ok({ aSize: aSize.value, bSize: bSize.value, ratio: finite.value });
};
