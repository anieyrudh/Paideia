import { err, ok, type KernelResult } from "@paideia/shared";

export const mlLinearTolerance = {
  default: 1e-9,
  tight: 1e-12,
  loose: 1e-6,
} as const;

export interface Point2D {
  readonly x: number;
  readonly y: number;
}

export interface LinearModel {
  readonly slope: number;
  readonly intercept: number;
}

export interface FitUnivariateLinearRegressionInput {
  readonly points: readonly Point2D[];
}

export interface LinearRegressionFit {
  readonly model: LinearModel;
  readonly meanX: number;
  readonly meanY: number;
  readonly residualSumOfSquares: number;
}

export interface PredictLinearInput {
  readonly model: LinearModel;
  readonly x: number;
}

export interface MeanSquaredErrorInput {
  readonly model: LinearModel;
  readonly points: readonly Point2D[];
}

const finite = (value: number, label: string): KernelResult<void> =>
  Number.isFinite(value)
    ? ok(undefined)
    : err("precondition-violated", `${label} must be finite; got ${value}`);

const finiteDerived = (value: number, label: string): KernelResult<void> =>
  Number.isFinite(value)
    ? ok(undefined)
    : err("numerical-instability", `${label} must be finite after computation; got ${value}`);

const validatePoint = (point: Point2D, label: string): KernelResult<void> => {
  const x = finite(point.x, `${label}.x`);
  if (!x.ok) return x;
  return finite(point.y, `${label}.y`);
};

const validateModel = (model: LinearModel): KernelResult<void> => {
  const slope = finite(model.slope, "model.slope");
  if (!slope.ok) return slope;
  return finite(model.intercept, "model.intercept");
};

export const predictLinear = (input: PredictLinearInput): KernelResult<number> => {
  const model = validateModel(input.model);
  if (!model.ok) return model;
  const x = finite(input.x, "x");
  if (!x.ok) return x;
  const prediction = input.model.slope * input.x + input.model.intercept;
  const computed = finiteDerived(prediction, "prediction");
  if (!computed.ok) return computed;
  return ok(prediction);
};

export const fitUnivariateLinearRegression = (
  input: FitUnivariateLinearRegressionInput,
): KernelResult<LinearRegressionFit> => {
  if (input.points.length < 2) {
    return err("precondition-violated", "points must contain at least two observations");
  }
  for (const [index, point] of input.points.entries()) {
    const valid = validatePoint(point, `points[${index}]`);
    if (!valid.ok) return valid;
  }
  const meanX = input.points.reduce((sum, point) => sum + point.x, 0) / input.points.length;
  const meanY = input.points.reduce((sum, point) => sum + point.y, 0) / input.points.length;
  let numerator = 0;
  let denominator = 0;
  for (const point of input.points) {
    numerator += (point.x - meanX) * (point.y - meanY);
    denominator += (point.x - meanX) ** 2;
  }
  if (Math.abs(denominator) <= mlLinearTolerance.tight) {
    return err("out-of-domain", "points must contain variation in x");
  }
  const slope = numerator / denominator;
  const intercept = meanY - slope * meanX;
  const model = Object.freeze({ slope, intercept });
  const mse = meanSquaredError({ model, points: input.points });
  if (!mse.ok) return mse;
  const residualSumOfSquares = mse.value * input.points.length;
  return ok(Object.freeze({
    model,
    meanX,
    meanY,
    residualSumOfSquares,
  }));
};

export const meanSquaredError = (input: MeanSquaredErrorInput): KernelResult<number> => {
  const model = validateModel(input.model);
  if (!model.ok) return model;
  if (input.points.length === 0) {
    return err("precondition-violated", "points must not be empty");
  }
  let sumSquaredError = 0;
  for (const [index, point] of input.points.entries()) {
    const valid = validatePoint(point, `points[${index}]`);
    if (!valid.ok) return valid;
    const prediction = input.model.slope * point.x + input.model.intercept;
    sumSquaredError += (point.y - prediction) ** 2;
  }
  const value = sumSquaredError / input.points.length;
  const computed = finiteDerived(value, "meanSquaredError");
  if (!computed.ok) return computed;
  return ok(value);
};
