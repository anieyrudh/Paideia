import { err, ok, type KernelResult } from "@paideia/shared";

export type CriterionDirection = "higher-is-better" | "lower-is-better";

export interface CriterionScale {
  readonly min: number;
  readonly max: number;
}

export interface ComparisonCriterion {
  readonly id: string;
  readonly label: string;
  readonly direction: CriterionDirection;
  readonly weight?: number;
  readonly scale?: CriterionScale;
}

export interface ComparisonOption {
  readonly id: string;
  readonly label: string;
  readonly values: Readonly<Record<string, number>>;
}

export interface ComparisonMatrix {
  readonly criteria: readonly ComparisonCriterion[];
  readonly options: readonly ComparisonOption[];
}

export interface WeightedScore {
  readonly optionId: string;
  readonly score: number;
  readonly normalized: Readonly<Record<string, number>>;
}

export interface RankedOption extends WeightedScore {
  readonly rank: number;
}

export interface PairwiseDelta {
  readonly criterionId: string;
  readonly left: number;
  readonly right: number;
  readonly delta: number;
  readonly favored: "left" | "right" | "tie";
}

export const normalizeCriterionValue = (
  value: number,
  criterion: ComparisonCriterion,
): KernelResult<number> => {
  const validCriterion = validateCriterion(criterion);
  if (!validCriterion.ok) return validCriterion;
  if (!Number.isFinite(value)) {
    return err("out-of-domain", `Criterion value must be finite for ${criterion.id}`);
  }

  const scale = criterion.scale ?? { min: 0, max: 1 };
  const raw = (value - scale.min) / (scale.max - scale.min);
  const directed =
    criterion.direction === "higher-is-better" ? raw : 1 - raw;

  if (directed < 0 || directed > 1) {
    return err(
      "out-of-domain",
      `Normalized value for ${criterion.id} must be in [0, 1], got ${directed}`,
    );
  }

  return ok(directed);
};

export const scoreOption = (
  option: ComparisonOption,
  criteria: readonly ComparisonCriterion[],
): KernelResult<WeightedScore> => {
  const matrix = validateComparisonMatrix({ criteria, options: [option] });
  if (!matrix.ok) return matrix;

  const totalWeight = effectiveWeightTotal(criteria);
  if (totalWeight <= 0) {
    return err("precondition-violated", "At least one criterion must have positive weight");
  }

  const normalized: Record<string, number> = {};
  let weighted = 0;
  for (const criterion of criteria) {
    const value = option.values[criterion.id];
    if (value === undefined) {
      return err("precondition-violated", `Missing value for criterion ${criterion.id}`);
    }
    const normalizedValue = normalizeCriterionValue(value, criterion);
    if (!normalizedValue.ok) return normalizedValue;
    normalized[criterion.id] = normalizedValue.value;
    weighted += normalizedValue.value * effectiveWeight(criterion);
  }

  return ok({
    optionId: option.id,
    score: weighted / totalWeight,
    normalized,
  });
};

export const rankOptions = (
  matrix: ComparisonMatrix,
): KernelResult<readonly RankedOption[]> => {
  const validMatrix = validateComparisonMatrix(matrix);
  if (!validMatrix.ok) return validMatrix;

  const scores: WeightedScore[] = [];
  for (const option of matrix.options) {
    const score = scoreOption(option, matrix.criteria);
    if (!score.ok) return score;
    scores.push(score.value);
  }

  const sorted = [...scores].sort((left, right) => {
    const scoreDiff = right.score - left.score;
    return scoreDiff === 0 ? left.optionId.localeCompare(right.optionId) : scoreDiff;
  });

  const ranked: RankedOption[] = [];
  let previousScore: number | null = null;
  let previousRank = 0;
  for (const [index, score] of sorted.entries()) {
    const rank = previousScore === score.score ? previousRank : index + 1;
    ranked.push({ ...score, rank });
    previousScore = score.score;
    previousRank = rank;
  }

  return ok(ranked);
};

export const pairwiseCompare = (
  left: ComparisonOption,
  right: ComparisonOption,
  criteria: readonly ComparisonCriterion[],
): KernelResult<readonly PairwiseDelta[]> => {
  const matrix = validateComparisonMatrix({ criteria, options: [left, right] });
  if (!matrix.ok) return matrix;

  const deltas: PairwiseDelta[] = [];
  for (const criterion of criteria) {
    const leftValue = left.values[criterion.id];
    const rightValue = right.values[criterion.id];
    if (leftValue === undefined || rightValue === undefined) {
      return err("precondition-violated", `Missing value for criterion ${criterion.id}`);
    }
    const delta =
      criterion.direction === "higher-is-better"
        ? leftValue - rightValue
        : rightValue - leftValue;
    deltas.push({
      criterionId: criterion.id,
      left: leftValue,
      right: rightValue,
      delta,
      favored: delta > 0 ? "left" : delta < 0 ? "right" : "tie",
    });
  }

  return ok(deltas);
};

export const paretoFront = (
  matrix: ComparisonMatrix,
): KernelResult<readonly ComparisonOption[]> => {
  const validMatrix = validateComparisonMatrix(matrix);
  if (!validMatrix.ok) return validMatrix;

  const front: ComparisonOption[] = [];
  for (const candidate of matrix.options) {
    let dominated = false;
    for (const other of matrix.options) {
      if (other.id === candidate.id) continue;
      const dominance = dominates(other, candidate, matrix.criteria);
      if (!dominance.ok) return dominance;
      if (dominance.value) {
        dominated = true;
        break;
      }
    }
    if (!dominated) front.push(candidate);
  }

  return ok(front);
};

export const validateComparisonMatrix = (
  matrix: ComparisonMatrix,
): KernelResult<ComparisonMatrix> => {
  if (matrix.criteria.length === 0) {
    return err("precondition-violated", "Comparison matrix requires at least one criterion");
  }

  if (matrix.options.length === 0) {
    return err("precondition-violated", "Comparison matrix requires at least one option");
  }

  const criterionIds = new Set<string>();
  for (const criterion of matrix.criteria) {
    const validCriterion = validateCriterion(criterion);
    if (!validCriterion.ok) return validCriterion;
    if (criterionIds.has(criterion.id)) {
      return err("precondition-violated", `Duplicate criterion id: ${criterion.id}`);
    }
    criterionIds.add(criterion.id);
  }

  const optionIds = new Set<string>();
  for (const option of matrix.options) {
    if (!isTrimmedNonEmpty(option.id)) {
      return err("precondition-violated", "Option id must be non-empty and trimmed");
    }
    if (!isTrimmedNonEmpty(option.label)) {
      return err("precondition-violated", "Option label must be non-empty and trimmed");
    }
    if (optionIds.has(option.id)) {
      return err("precondition-violated", `Duplicate option id: ${option.id}`);
    }
    optionIds.add(option.id);

    for (const criterion of matrix.criteria) {
      const value = option.values[criterion.id];
      if (value === undefined) {
        return err("precondition-violated", `Missing value for criterion ${criterion.id}`);
      }
      if (!Number.isFinite(value)) {
        return err("out-of-domain", `Value for criterion ${criterion.id} must be finite`);
      }
    }
  }

  return ok(matrix);
};

const validateCriterion = (
  criterion: ComparisonCriterion,
): KernelResult<ComparisonCriterion> => {
  if (!isTrimmedNonEmpty(criterion.id)) {
    return err("precondition-violated", "Criterion id must be non-empty and trimmed");
  }

  if (!isTrimmedNonEmpty(criterion.label)) {
    return err("precondition-violated", "Criterion label must be non-empty and trimmed");
  }

  if (
    criterion.direction !== "higher-is-better" &&
    criterion.direction !== "lower-is-better"
  ) {
    return err("out-of-domain", `Unknown criterion direction: ${String(criterion.direction)}`);
  }

  if (
    criterion.weight !== undefined &&
    (!Number.isFinite(criterion.weight) || criterion.weight < 0)
  ) {
    return err("out-of-domain", "Criterion weight must be finite and non-negative");
  }

  if (criterion.scale !== undefined) {
    const { min, max } = criterion.scale;
    if (!Number.isFinite(min) || !Number.isFinite(max) || min >= max) {
      return err("out-of-domain", "Criterion scale must be finite with min < max");
    }
  }

  return ok(criterion);
};

const dominates = (
  left: ComparisonOption,
  right: ComparisonOption,
  criteria: readonly ComparisonCriterion[],
): KernelResult<boolean> => {
  let strictlyBetter = false;
  for (const criterion of criteria) {
    const leftValue = left.values[criterion.id];
    const rightValue = right.values[criterion.id];
    if (leftValue === undefined || rightValue === undefined) {
      return err("precondition-violated", `Missing value for criterion ${criterion.id}`);
    }
    const diff =
      criterion.direction === "higher-is-better"
        ? leftValue - rightValue
        : rightValue - leftValue;
    if (diff < 0) return ok(false);
    if (diff > 0) strictlyBetter = true;
  }

  return ok(strictlyBetter);
};

const effectiveWeight = (criterion: ComparisonCriterion): number => criterion.weight ?? 1;

const effectiveWeightTotal = (criteria: readonly ComparisonCriterion[]): number =>
  criteria.reduce((sum, criterion) => sum + effectiveWeight(criterion), 0);

const isTrimmedNonEmpty = (value: string): boolean =>
  value.length > 0 && value.trim() === value;
