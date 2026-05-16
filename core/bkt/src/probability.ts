import {
  err,
  ok,
  probability,
  type KernelResult,
  type Probability,
} from "@paideia/shared";

export const EPSILON = 1e-6;

export const toProbability = (
  value: number,
  label: string,
): KernelResult<Probability> => {
  if (!Number.isFinite(value)) {
    return err("out-of-domain", `${label} must be finite, got ${value}`);
  }

  const result = probability(value);
  if (!result.ok) {
    return err("out-of-domain", `${label} must be in [0,1], got ${value}`);
  }

  return ok(result.value);
};

export const clampProbability = (value: number): Probability => {
  const clamped = Math.min(1, Math.max(0, value));
  const result = probability(clamped);
  if (!result.ok) {
    throw new Error(`Internal probability clamp failed for ${value}`);
  }

  return result.value;
};

export const probabilityConstant = (value: number): Probability => {
  const result = probability(value);
  if (!result.ok) {
    throw new Error(`Invalid BKT probability constant: ${value}`);
  }

  return result.value;
};

export const boundedEstimate = (value: number): Probability =>
  clampProbability(Math.min(1 - EPSILON, Math.max(EPSILON, value)));
