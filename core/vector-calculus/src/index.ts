import {
  err,
  ok,
  type Function3D,
  type KernelResult,
  type ParametricCurve2D,
  type Rect,
  type VectorField2D,
} from "@paideia/shared";

export const vectorCalculusTolerance = {
  default: 1e-6,
  derivative: 1e-5,
  integral: 1e-4,
} as const;

export type Point2 = readonly [x: number, y: number];
export type Vector2 = readonly [x: number, y: number];
export type Matrix2 = readonly [
  readonly [number, number],
  readonly [number, number],
];

export type IntegrationRule2D = "midpoint" | "trapezoid";

export interface DerivativeOptions {
  readonly h?: number;
}

export interface GridOptions {
  readonly nx?: number;
  readonly ny?: number;
}

export interface ParametricBounds {
  readonly min: number;
  readonly max: number;
}

export interface CurveSample2D {
  readonly t: number;
  readonly point: Point2;
  readonly tangent: Vector2;
  readonly speed: number;
}

export interface Gradient2D {
  readonly at: Point2;
  readonly value: Vector2;
  readonly magnitude: number;
}

export interface Hessian2D {
  readonly at: Point2;
  readonly matrix: Matrix2;
}

export interface Divergence2D {
  readonly at: Point2;
  readonly value: number;
}

export interface Curl2D {
  readonly at: Point2;
  readonly zComponent: number;
}

export interface RectIntegral2D {
  readonly value: number;
  readonly cells: number;
  readonly rule: IntegrationRule2D;
  readonly samples: readonly RectIntegralSample2D[];
}

export interface RectIntegralSample2D {
  readonly point: Point2;
  readonly value: number;
  readonly weight: number;
  readonly contribution: number;
}

export interface LineIntegral2D {
  readonly value: number;
  readonly samples: readonly CurveSample2D[];
  readonly bounds: ParametricBounds;
  readonly steps: number;
}

export interface VectorFieldSample2D {
  readonly point: Point2;
  readonly vector: Vector2;
  readonly magnitude: number;
}

export const point2 = (x: number, y: number): KernelResult<Point2> =>
  validatePoint([x, y], "point");

export const gradient2D = (
  field: Function3D,
  at: Point2,
  opts: DerivativeOptions = {},
): KernelResult<Gradient2D> => {
  const point = validatePoint(at, "at");
  if (!point.ok) return point;
  const h = usableStep(point.value, opts.h);
  if (!h.ok) return h;

  const dx = partialX(field, point.value, h.value);
  if (!dx.ok) return dx;
  const dy = partialY(field, point.value, h.value);
  if (!dy.ok) return dy;
  const magnitude = Math.hypot(dx.value, dy.value);
  if (!Number.isFinite(magnitude)) {
    return err("numerical-instability", "gradient magnitude is non-finite");
  }
  return ok({ at: point.value, value: [dx.value, dy.value], magnitude });
};

export const hessian2D = (
  field: Function3D,
  at: Point2,
  opts: DerivativeOptions = {},
): KernelResult<Hessian2D> => {
  const point = validatePoint(at, "at");
  if (!point.ok) return point;
  const h = usableStep(point.value, opts.h);
  if (!h.ok) return h;
  const [x, y] = point.value;
  const center = sampleScalar(field, x, y);
  if (!center.ok) return center;
  const right = sampleScalar(field, x + h.value, y);
  if (!right.ok) return right;
  const left = sampleScalar(field, x - h.value, y);
  if (!left.ok) return left;
  const up = sampleScalar(field, x, y + h.value);
  if (!up.ok) return up;
  const down = sampleScalar(field, x, y - h.value);
  if (!down.ok) return down;
  const upRight = sampleScalar(field, x + h.value, y + h.value);
  if (!upRight.ok) return upRight;
  const upLeft = sampleScalar(field, x - h.value, y + h.value);
  if (!upLeft.ok) return upLeft;
  const downRight = sampleScalar(field, x + h.value, y - h.value);
  if (!downRight.ok) return downRight;
  const downLeft = sampleScalar(field, x - h.value, y - h.value);
  if (!downLeft.ok) return downLeft;

  const h2 = h.value * h.value;
  const dxx = (right.value - 2 * center.value + left.value) / h2;
  const dyy = (up.value - 2 * center.value + down.value) / h2;
  const dxy =
    (upRight.value - upLeft.value - downRight.value + downLeft.value) /
    (4 * h2);
  const matrix: Matrix2 = [
    [dxx, dxy],
    [dxy, dyy],
  ];
  return finiteMatrix(matrix, "Hessian").ok
    ? ok({ at: point.value, matrix })
    : err("numerical-instability", "Hessian contains non-finite entries");
};

export const divergence2D = (
  field: VectorField2D,
  at: Point2,
  opts: DerivativeOptions = {},
): KernelResult<Divergence2D> => {
  const point = validatePoint(at, "at");
  if (!point.ok) return point;
  const h = usableStep(point.value, opts.h);
  if (!h.ok) return h;
  const [x, y] = point.value;
  const right = sampleVector(field, x + h.value, y);
  if (!right.ok) return right;
  const left = sampleVector(field, x - h.value, y);
  if (!left.ok) return left;
  const up = sampleVector(field, x, y + h.value);
  if (!up.ok) return up;
  const down = sampleVector(field, x, y - h.value);
  if (!down.ok) return down;
  const value =
    (right.value[0] - left.value[0]) / (2 * h.value) +
    (up.value[1] - down.value[1]) / (2 * h.value);
  return finiteNumber(value, "divergence").ok
    ? ok({ at: point.value, value })
    : err("numerical-instability", "divergence is non-finite");
};

export const curl2D = (
  field: VectorField2D,
  at: Point2,
  opts: DerivativeOptions = {},
): KernelResult<Curl2D> => {
  const point = validatePoint(at, "at");
  if (!point.ok) return point;
  const h = usableStep(point.value, opts.h);
  if (!h.ok) return h;
  const [x, y] = point.value;
  const right = sampleVector(field, x + h.value, y);
  if (!right.ok) return right;
  const left = sampleVector(field, x - h.value, y);
  if (!left.ok) return left;
  const up = sampleVector(field, x, y + h.value);
  if (!up.ok) return up;
  const down = sampleVector(field, x, y - h.value);
  if (!down.ok) return down;
  const zComponent =
    (right.value[1] - left.value[1]) / (2 * h.value) -
    (up.value[0] - down.value[0]) / (2 * h.value);
  return finiteNumber(zComponent, "curl").ok
    ? ok({ at: point.value, zComponent })
    : err("numerical-instability", "curl is non-finite");
};

export const doubleIntegralRect = (
  field: Function3D,
  rect: Rect,
  opts: GridOptions & { readonly rule?: IntegrationRule2D } = {},
): KernelResult<RectIntegral2D> => {
  const validRect = validateRect(rect);
  if (!validRect.ok) return validRect;
  const nx = positiveInteger(opts.nx ?? 32, "nx");
  if (!nx.ok) return nx;
  const ny = positiveInteger(opts.ny ?? 32, "ny");
  if (!ny.ok) return ny;
  const rule = validateIntegrationRule(opts.rule ?? "midpoint");
  if (!rule.ok) return rule;
  const dx = (rect.x.max - rect.x.min) / nx.value;
  const dy = (rect.y.max - rect.y.min) / ny.value;
  let total = 0;
  const samples: RectIntegralSample2D[] = [];
  for (let ix = 0; ix < nx.value; ix += 1) {
    for (let iy = 0; iy < ny.value; iy += 1) {
      const contribution =
        rule.value === "trapezoid"
          ? trapezoidCell(field, rect.x.min + ix * dx, rect.y.min + iy * dy, dx, dy)
          : midpointCell(field, rect.x.min + ix * dx, rect.y.min + iy * dy, dx, dy);
      if (!contribution.ok) return contribution;
      for (const sample of contribution.value) {
        total += sample.contribution;
        samples.push(sample);
      }
    }
  }
  if (!Number.isFinite(total)) {
    return err("numerical-instability", "double integral is non-finite");
  }
  return ok({ value: total, cells: nx.value * ny.value, rule: rule.value, samples });
};

export const lineIntegral2D = (
  field: VectorField2D,
  curve: ParametricCurve2D,
  bounds: ParametricBounds,
  opts: { readonly steps?: number; readonly h?: number } = {},
): KernelResult<LineIntegral2D> =>
  integrateCurve(curve, bounds, opts, (sample) => {
    const value = sampleVector(field, sample.point[0], sample.point[1]);
    if (!value.ok) return value;
    return finiteNumber(
      value.value[0] * sample.tangent[0] + value.value[1] * sample.tangent[1],
      "line integral integrand",
    );
  });

export const scalarLineIntegral2D = (
  field: Function3D,
  curve: ParametricCurve2D,
  bounds: ParametricBounds,
  opts: { readonly steps?: number; readonly h?: number } = {},
): KernelResult<LineIntegral2D> =>
  integrateCurve(curve, bounds, opts, (sample) => {
    const value = sampleScalar(field, sample.point[0], sample.point[1]);
    if (!value.ok) return value;
    return finiteNumber(value.value * sample.speed, "scalar line integral integrand");
  });

export const sampleVectorField2D = (
  field: VectorField2D,
  rect: Rect,
  opts: GridOptions = {},
): KernelResult<readonly VectorFieldSample2D[]> => {
  const validRect = validateRect(rect);
  if (!validRect.ok) return validRect;
  const nx = positiveInteger(opts.nx ?? 12, "nx");
  if (!nx.ok) return nx;
  const ny = positiveInteger(opts.ny ?? 12, "ny");
  if (!ny.ok) return ny;
  const dx = nx.value === 1 ? 0 : (rect.x.max - rect.x.min) / (nx.value - 1);
  const dy = ny.value === 1 ? 0 : (rect.y.max - rect.y.min) / (ny.value - 1);
  const samples: VectorFieldSample2D[] = [];
  for (let ix = 0; ix < nx.value; ix += 1) {
    for (let iy = 0; iy < ny.value; iy += 1) {
      const point: Point2 = [rect.x.min + ix * dx, rect.y.min + iy * dy];
      const vector = sampleVector(field, point[0], point[1]);
      if (!vector.ok) return vector;
      const magnitude = finiteNumber(Math.hypot(vector.value[0], vector.value[1]), "vector magnitude");
      if (!magnitude.ok) {
        return err("numerical-instability", "vector-field magnitude is non-finite");
      }
      samples.push({
        point,
        vector: vector.value,
        magnitude: magnitude.value,
      });
    }
  }
  return ok(samples);
};

const integrateCurve = (
  curve: ParametricCurve2D,
  bounds: ParametricBounds,
  opts: { readonly steps?: number; readonly h?: number },
  integrand: (sample: CurveSample2D) => KernelResult<number>,
): KernelResult<LineIntegral2D> => {
  const validBounds = validateParametricBounds(bounds);
  if (!validBounds.ok) return validBounds;
  const steps = positiveInteger(opts.steps ?? 128, "steps");
  if (!steps.ok) return steps;
  const dt = (bounds.max - bounds.min) / steps.value;
  const h = finiteNumber(opts.h ?? Math.max(1e-6, Math.abs(dt) * 1e-3), "h");
  if (!h.ok) return h;
  if (h.value <= 0) {
    return err("precondition-violated", `h must be positive; got ${h.value}`);
  }
  const samples: CurveSample2D[] = [];
  let total = 0;
  for (let index = 0; index < steps.value; index += 1) {
    const t = bounds.min + (index + 0.5) * dt;
    const sample = curveSample(curve, t, h.value);
    if (!sample.ok) return sample;
    const value = integrand(sample.value);
    if (!value.ok) return value;
    total += value.value * dt;
    samples.push(sample.value);
  }
  if (!Number.isFinite(total)) {
    return err("numerical-instability", "line integral is non-finite");
  }
  return ok({ value: total, samples, bounds: { ...bounds }, steps: steps.value });
};

const partialX = (
  field: Function3D,
  at: Point2,
  h: number,
): KernelResult<number> => {
  const right = sampleScalar(field, at[0] + h, at[1]);
  if (!right.ok) return right;
  const left = sampleScalar(field, at[0] - h, at[1]);
  if (!left.ok) return left;
  return finiteNumber((right.value - left.value) / (2 * h), "partial x");
};

const partialY = (
  field: Function3D,
  at: Point2,
  h: number,
): KernelResult<number> => {
  const up = sampleScalar(field, at[0], at[1] + h);
  if (!up.ok) return up;
  const down = sampleScalar(field, at[0], at[1] - h);
  if (!down.ok) return down;
  return finiteNumber((up.value - down.value) / (2 * h), "partial y");
};

const midpointCell = (
  field: Function3D,
  x0: number,
  y0: number,
  dx: number,
  dy: number,
): KernelResult<readonly RectIntegralSample2D[]> => {
  const value = sampleScalar(field, x0 + dx / 2, y0 + dy / 2);
  if (!value.ok) return value;
  const contribution = finiteNumber(value.value * dx * dy, "midpoint cell contribution");
  if (!contribution.ok) return contribution;
  return ok([
    {
      point: [x0 + dx / 2, y0 + dy / 2],
      value: value.value,
      weight: dx * dy,
      contribution: contribution.value,
    },
  ]);
};

const trapezoidCell = (
  field: Function3D,
  x0: number,
  y0: number,
  dx: number,
  dy: number,
): KernelResult<readonly RectIntegralSample2D[]> => {
  const a = sampleScalar(field, x0, y0);
  if (!a.ok) return a;
  const b = sampleScalar(field, x0 + dx, y0);
  if (!b.ok) return b;
  const c = sampleScalar(field, x0, y0 + dy);
  if (!c.ok) return c;
  const d = sampleScalar(field, x0 + dx, y0 + dy);
  if (!d.ok) return d;
  const weight = (dx * dy) / 4;
  const samples: RectIntegralSample2D[] = [
    { point: [x0, y0], value: a.value, weight, contribution: a.value * weight },
    { point: [x0 + dx, y0], value: b.value, weight, contribution: b.value * weight },
    { point: [x0, y0 + dy], value: c.value, weight, contribution: c.value * weight },
    { point: [x0 + dx, y0 + dy], value: d.value, weight, contribution: d.value * weight },
  ];
  for (const sample of samples) {
    const contribution = finiteNumber(sample.contribution, "trapezoid cell contribution");
    if (!contribution.ok) return contribution;
  }
  return ok(samples);
};

const curveSample = (
  curve: ParametricCurve2D,
  t: number,
  h: number,
): KernelResult<CurveSample2D> => {
  const point = sampleCurve(curve, t);
  if (!point.ok) return point;
  const right = sampleCurve(curve, t + h);
  if (!right.ok) return right;
  const left = sampleCurve(curve, t - h);
  if (!left.ok) return left;
  const tangent: Vector2 = [
    (right.value[0] - left.value[0]) / (2 * h),
    (right.value[1] - left.value[1]) / (2 * h),
  ];
  const speed = Math.hypot(tangent[0], tangent[1]);
  if (!Number.isFinite(speed)) {
    return err("numerical-instability", "curve speed is non-finite");
  }
  return ok({ t, point: point.value, tangent, speed });
};

const usableStep = (
  at: Point2,
  explicit?: number,
): KernelResult<number> => {
  const h = explicit ?? vectorCalculusTolerance.derivative * Math.max(1, Math.abs(at[0]), Math.abs(at[1]));
  const valid = finiteNumber(h, "h");
  if (!valid.ok) return valid;
  if (h <= 0) {
    return err("precondition-violated", `h must be positive; got ${h}`);
  }
  if (at[0] + h === at[0] || at[1] + h === at[1]) {
    return err("numerical-instability", `h=${h} is too small around [${at[0]}, ${at[1]}]`);
  }
  return ok(h);
};

const sampleScalar = (
  field: Function3D,
  x: number,
  y: number,
): KernelResult<number> => {
  const point = validatePoint([x, y], "sample point");
  if (!point.ok) return point;
  try {
    const value = field(x, y);
    return Number.isFinite(value)
      ? ok(value)
      : err("undefined-at-point", `scalar field is undefined at [${x}, ${y}]`);
  } catch (cause) {
    return err("undefined-at-point", `scalar field threw at [${x}, ${y}]`, cause);
  }
};

const sampleVector = (
  field: VectorField2D,
  x: number,
  y: number,
): KernelResult<Vector2> => {
  const point = validatePoint([x, y], "sample point");
  if (!point.ok) return point;
  try {
    return validatePoint(field(x, y), `vector field at [${x}, ${y}]`);
  } catch (cause) {
    return err("undefined-at-point", `vector field threw at [${x}, ${y}]`, cause);
  }
};

const sampleCurve = (
  curve: ParametricCurve2D,
  t: number,
): KernelResult<Point2> => {
  const validT = finiteNumber(t, "t");
  if (!validT.ok) return validT;
  try {
    return validatePoint(curve(t), `curve at t=${t}`);
  } catch (cause) {
    return err("undefined-at-point", `curve threw at t=${t}`, cause);
  }
};

const validatePoint = (
  point: readonly number[],
  label: string,
): KernelResult<Point2> => {
  if (point.length !== 2) {
    return err("precondition-violated", `${label} must contain exactly two finite coordinates`);
  }
  const x = point[0];
  const y = point[1];
  if (x === undefined || y === undefined || !Number.isFinite(x) || !Number.isFinite(y)) {
    return err("precondition-violated", `${label} must contain exactly two finite coordinates`);
  }
  return ok([x, y]);
};

const finiteMatrix = (matrix: Matrix2, label: string): KernelResult<Matrix2> =>
  matrix.every((row) => row.every(Number.isFinite))
    ? ok(matrix)
    : err("precondition-violated", `${label} must contain finite entries`);

const finiteNumber = (value: number, label: string): KernelResult<number> =>
  Number.isFinite(value)
    ? ok(value)
    : err("precondition-violated", `${label} must be finite; got ${value}`);

const positiveInteger = (value: number, label: string): KernelResult<number> =>
  Number.isInteger(value) && value > 0
    ? ok(value)
    : err("precondition-violated", `${label} must be a positive integer; got ${value}`);

const validateIntegrationRule = (
  rule: string,
): KernelResult<IntegrationRule2D> =>
  rule === "midpoint" || rule === "trapezoid"
    ? ok(rule)
    : err("precondition-violated", `unknown integration rule ${rule}`);

const validateRect = (rect: Rect): KernelResult<void> => {
  for (const [axis, interval] of [
    ["x", rect.x],
    ["y", rect.y],
  ] as const) {
    if (!Number.isFinite(interval.min) || !Number.isFinite(interval.max)) {
      return err("precondition-violated", `${axis} bounds must be finite`);
    }
    if (interval.min >= interval.max) {
      return err("precondition-violated", `${axis} bounds must satisfy min < max`);
    }
  }
  return ok(undefined);
};

const validateParametricBounds = (
  bounds: ParametricBounds,
): KernelResult<void> => {
  if (!Number.isFinite(bounds.min) || !Number.isFinite(bounds.max)) {
    return err("precondition-violated", "parametric bounds must be finite");
  }
  if (bounds.min >= bounds.max) {
    return err("precondition-violated", "parametric bounds must satisfy min < max");
  }
  return ok(undefined);
};
