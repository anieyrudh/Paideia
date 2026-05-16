import type {
  Function2D,
  Interval,
  ParametricCurve2D,
  Rect,
  VectorField2D,
} from "@paideia/shared";
import { err, ok, type KernelResult } from "@paideia/shared";
import type { SvgPoint } from "./scales.js";

export interface SampledSegments {
  readonly segments: readonly (readonly SvgPoint[])[];
}

export interface VectorSample {
  readonly x: number;
  readonly y: number;
  readonly vx: number;
  readonly vy: number;
}

const finiteNumber = (value: number): boolean => Number.isFinite(value);

export const evaluateAt = (f: Function2D, x: number): KernelResult<number> => {
  let value: number;
  try {
    value = f(x);
  } catch (cause) {
    return err("undefined-at-point", `Function is undefined at x=${x}`, cause);
  }

  return finiteNumber(value)
    ? ok(value)
    : err("undefined-at-point", `Function returned a non-finite value at x=${x}`);
};

const inRange = (value: number, range: Interval | undefined): boolean =>
  range === undefined || (value >= range.min && value <= range.max);

const pushGapAware = (
  segments: SvgPoint[][],
  current: SvgPoint[],
  point: SvgPoint | null,
): SvgPoint[] => {
  if (point === null) {
    if (current.length > 0) segments.push(current);
    return [];
  }

  current.push(point);
  return current;
};

export const sampleFunction = (
  f: Function2D,
  domain: Interval,
  range: Interval | undefined,
  samples = 160,
): SampledSegments => {
  const count = Math.max(2, Math.floor(samples));
  const step = (domain.max - domain.min) / (count - 1);
  const segments: SvgPoint[][] = [];
  let current: SvgPoint[] = [];

  for (let index = 0; index < count; index += 1) {
    const x = domain.min + step * index;
    const result = evaluateAt(f, x);
    const point =
      result.ok && inRange(result.value, range) ? { x, y: result.value } : null;
    current = pushGapAware(segments, current, point);
  }

  if (current.length > 0) segments.push(current);
  return { segments };
};

export const sampleParametricCurve = (
  curve: ParametricCurve2D,
  t: Interval,
  samples = 160,
): SampledSegments => {
  const count = Math.max(2, Math.floor(samples));
  const step = (t.max - t.min) / (count - 1);
  const segments: SvgPoint[][] = [];
  let current: SvgPoint[] = [];

  for (let index = 0; index < count; index += 1) {
    const value = t.min + step * index;
    let point: readonly [number, number] | null = null;
    try {
      point = curve(value);
    } catch {
      point = null;
    }

    const next =
      point !== null && finiteNumber(point[0]) && finiteNumber(point[1])
        ? { x: point[0], y: point[1] }
        : null;
    current = pushGapAware(segments, current, next);
  }

  if (current.length > 0) segments.push(current);
  return { segments };
};

export const sampleVectorField = (
  field: VectorField2D,
  region: Rect,
  density = 12,
  normalize = false,
): readonly VectorSample[] => {
  const count = Math.max(2, Math.floor(density));
  const xStep = (region.x.max - region.x.min) / (count - 1);
  const yStep = (region.y.max - region.y.min) / (count - 1);
  const samples: VectorSample[] = [];

  for (let xi = 0; xi < count; xi += 1) {
    for (let yi = 0; yi < count; yi += 1) {
      const x = region.x.min + xStep * xi;
      const y = region.y.min + yStep * yi;
      let vector: readonly [number, number];
      try {
        vector = field(x, y);
      } catch {
        continue;
      }
      const [rawVx, rawVy] = vector;
      if (!finiteNumber(rawVx) || !finiteNumber(rawVy)) continue;
      const magnitude = Math.hypot(rawVx, rawVy);
      const scale = normalize && magnitude > 0 ? 1 / magnitude : 1;
      samples.push({ x, y, vx: rawVx * scale, vy: rawVy * scale });
    }
  }

  return samples;
};

export const inferRange = (segments: SampledSegments): Interval => {
  const values = segments.segments.flatMap((segment) => segment.map((point) => point.y));
  if (values.length === 0) return { min: -1, max: 1 };
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (min === max) return { min: min - 1, max: max + 1 };
  const padding = (max - min) * 0.08;
  return { min: min - padding, max: max + padding };
};

export const inferRectFromPoints = (points: readonly (readonly [number, number])[]): Rect => {
  if (points.length === 0) {
    return { x: { min: -1, max: 1 }, y: { min: -1, max: 1 } };
  }
  const xs = points.map((point) => point[0]);
  const ys = points.map((point) => point[1]);
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const yMin = Math.min(...ys);
  const yMax = Math.max(...ys);
  return {
    x: xMin === xMax ? { min: xMin - 1, max: xMax + 1 } : { min: xMin, max: xMax },
    y: yMin === yMax ? { min: yMin - 1, max: yMax + 1 } : { min: yMin, max: yMax },
  };
};
