import {
  err,
  ok,
  type Function2D,
  type Interval,
  type KernelResult,
} from "@paideia/shared";
import {
  adaptiveStep,
  assertUsableStep,
  factorial,
  sample,
  validateBounds,
  validatePositiveInteger,
} from "./internal.js";

export const numericalTolerance = {
  default: 1e-6,
  tight: 1e-9,
  loose: 1e-4,
} as const;

const centralDifference = (
  f: Function2D,
  x: number,
  h: number,
): KernelResult<number> => {
  const validStep = assertUsableStep(x, h);
  if (!validStep.ok) return validStep;

  const right = sample(f, x + h);
  if (!right.ok) return right;
  const left = sample(f, x - h);
  if (!left.ok) return left;

  return ok((right.value - left.value) / (2 * h));
};

export const derivativeAt = (
  f: Function2D,
  x: number,
  opts: { order?: 1 | 2 | 4; h?: number } = {},
): KernelResult<number> => {
  if (!Number.isFinite(x)) {
    return err("precondition-violated", `x must be finite; got ${x}`);
  }

  const h = opts.h ?? adaptiveStep(x);
  const order = opts.order ?? 2;
  const validStep = assertUsableStep(x, h);
  if (!validStep.ok) return validStep;
  const center = sample(f, x);
  if (!center.ok) return center;

  const d1 = centralDifference(f, x, h);
  if (!d1.ok || order === 1) return d1;

  const d2 = centralDifference(f, x, h / 2);
  if (!d2.ok) return d2;
  const richardson2 = (4 * d2.value - d1.value) / 3;
  if (order === 2) return ok(richardson2);

  const d3 = centralDifference(f, x, h / 4);
  if (!d3.ok) return d3;
  const richardson2Half = (4 * d3.value - d2.value) / 3;
  return ok((16 * richardson2Half - richardson2) / 15);
};

export const derivative = (
  f: Function2D,
  x: number,
  h?: number,
): KernelResult<number> => derivativeAt(f, x, { order: 2, ...(h !== undefined && { h }) });

export const secantSlope = (
  f: Function2D,
  a: number,
  b: number,
): KernelResult<number> => {
  if (!Number.isFinite(a) || !Number.isFinite(b)) {
    return err("precondition-violated", `a and b must be finite; got ${a}, ${b}`);
  }

  if (a === b) {
    return err("precondition-violated", "Secant endpoints must be distinct");
  }

  const fa = sample(f, a);
  if (!fa.ok) return fa;
  const fb = sample(f, b);
  if (!fb.ok) return fb;

  return ok((fb.value - fa.value) / (b - a));
};

export const riemannSum = (
  f: Function2D,
  bounds: Interval,
  n: number,
  rule: "left" | "right" | "midpoint",
): KernelResult<number> => {
  const validBounds = validateBounds(bounds);
  if (!validBounds.ok) return validBounds;
  const validN = validatePositiveInteger(n, "n");
  if (!validN.ok) return validN;

  const width = (bounds.max - bounds.min) / n;
  let sum = 0;

  for (let i = 0; i < n; i += 1) {
    const x = (() => {
      switch (rule) {
        case "left":
          return bounds.min + i * width;
        case "right":
          return bounds.min + (i + 1) * width;
        case "midpoint":
          return bounds.min + (i + 0.5) * width;
      }
    })();

    const value = sample(f, x);
    if (!value.ok) return value;
    sum += value.value;
  }

  return ok(sum * width);
};

const trapezoidIntegral = (
  f: Function2D,
  bounds: Interval,
  n: number,
): KernelResult<number> => {
  const width = (bounds.max - bounds.min) / n;
  const first = sample(f, bounds.min);
  if (!first.ok) return first;
  const last = sample(f, bounds.max);
  if (!last.ok) return last;

  let sum = 0.5 * (first.value + last.value);
  for (let i = 1; i < n; i += 1) {
    const value = sample(f, bounds.min + i * width);
    if (!value.ok) return value;
    sum += value.value;
  }
  return ok(sum * width);
};

const simpsonIntegral = (
  f: Function2D,
  bounds: Interval,
  n: number,
): KernelResult<number> => {
  if (n < 2 || n % 2 !== 0) {
    return err("precondition-violated", `Simpson integration requires an even n >= 2; got ${n}`);
  }

  const width = (bounds.max - bounds.min) / n;
  const first = sample(f, bounds.min);
  if (!first.ok) return first;
  const last = sample(f, bounds.max);
  if (!last.ok) return last;

  let sum = first.value + last.value;
  for (let i = 1; i < n; i += 1) {
    const value = sample(f, bounds.min + i * width);
    if (!value.ok) return value;
    sum += (i % 2 === 0 ? 2 : 4) * value.value;
  }

  return ok((sum * width) / 3);
};

const gaussLegendreIntegral = (
  f: Function2D,
  bounds: Interval,
  n: number,
): KernelResult<number> => {
  const nodes = [
    -0.906179845938664,
    -0.5384693101056831,
    0,
    0.5384693101056831,
    0.906179845938664,
  ] as const;
  const weights = [
    0.2369268850561891,
    0.47862867049936647,
    0.5688888888888889,
    0.47862867049936647,
    0.2369268850561891,
  ] as const;

  const width = (bounds.max - bounds.min) / n;
  let total = 0;

  for (let intervalIndex = 0; intervalIndex < n; intervalIndex += 1) {
    const left = bounds.min + intervalIndex * width;
    const midpoint = left + width / 2;
    const halfWidth = width / 2;

    for (let nodeIndex = 0; nodeIndex < nodes.length; nodeIndex += 1) {
      const node = nodes[nodeIndex];
      const weight = weights[nodeIndex];
      if (node === undefined || weight === undefined) {
        return err("numerical-instability", "Gauss-Legendre table is inconsistent");
      }
      const value = sample(f, midpoint + halfWidth * node);
      if (!value.ok) return value;
      total += weight * value.value * halfWidth;
    }
  }

  return ok(total);
};

export const integral = (
  f: Function2D,
  bounds: Interval,
  opts: { method?: "simpson" | "trapezoid" | "gauss-legendre"; n?: number } = {},
): KernelResult<number> => {
  const validBounds = validateBounds(bounds);
  if (!validBounds.ok) return validBounds;

  const method = opts.method ?? "simpson";
  const n = opts.n ?? (method === "gauss-legendre" ? 64 : 256);
  const validN = validatePositiveInteger(n, "n");
  if (!validN.ok) return validN;

  switch (method) {
    case "simpson":
      return simpsonIntegral(f, bounds, n);
    case "trapezoid":
      return trapezoidIntegral(f, bounds, n);
    case "gauss-legendre":
      return gaussLegendreIntegral(f, bounds, n);
  }
};

const nthDerivative = (
  f: Function2D,
  x: number,
  order: number,
  h: number,
): KernelResult<number> => {
  if (order === 0) return sample(f, x);
  return derivativeAt(
    (t: number): number => {
      const value = nthDerivative(f, t, order - 1, h);
      return value.ok ? value.value : Number.NaN;
    },
    x,
    { order: 2, h },
  );
};

export const taylor = (
  f: Function2D,
  x0: number,
  n: number,
): KernelResult<Function2D> => {
  if (!Number.isFinite(x0)) {
    return err("precondition-violated", `x0 must be finite; got ${x0}`);
  }

  if (!Number.isInteger(n) || n < 0 || n > 8) {
    return err("precondition-violated", `Taylor degree must be an integer in [0, 8]; got ${n}`);
  }

  const h = Math.max(1e-3, Math.sqrt(numericalTolerance.default) * Math.max(1, Math.abs(x0)));
  const coefficients: number[] = [];

  for (let order = 0; order <= n; order += 1) {
    const derivativeValue = nthDerivative(f, x0, order, h);
    if (!derivativeValue.ok) return derivativeValue;
    coefficients.push(derivativeValue.value / factorial(order));
  }

  return ok((x: number): number => {
    let sum = 0;
    for (let order = coefficients.length - 1; order >= 0; order -= 1) {
      const coefficient = coefficients[order];
      if (coefficient === undefined) return Number.NaN;
      sum = sum * (x - x0) + coefficient;
    }
    return sum;
  });
};

export const linearRegression = (
  points: readonly [number, number][],
): KernelResult<{ m: number; b: number; r2: number }> => {
  if (points.length < 2) {
    return err("precondition-violated", "Linear regression requires at least two points");
  }

  let sumX = 0;
  let sumY = 0;
  for (const [x, y] of points) {
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      return err("precondition-violated", `Points must be finite; got (${x}, ${y})`);
    }
    sumX += x;
    sumY += y;
  }

  const n = points.length;
  const meanX = sumX / n;
  const meanY = sumY / n;
  let sxx = 0;
  let sxy = 0;
  let ssTot = 0;

  for (const [x, y] of points) {
    const dx = x - meanX;
    const dy = y - meanY;
    sxx += dx * dx;
    sxy += dx * dy;
    ssTot += dy * dy;
  }

  if (sxx === 0) {
    return err("precondition-violated", "Linear regression requires variation in x");
  }

  const m = sxy / sxx;
  const b = meanY - m * meanX;
  let ssRes = 0;
  for (const [x, y] of points) {
    const residual = y - (m * x + b);
    ssRes += residual * residual;
  }

  const r2 = ssTot === 0 ? 1 : 1 - ssRes / ssTot;
  return ok({ m, b, r2 });
};
