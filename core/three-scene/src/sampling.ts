import type {
  Box3,
  Function3D,
  Interval,
  ParametricCurve3D,
  Rect,
  VectorField3D,
} from "@paideia/shared";
import { colourMapViridis } from "./colours.js";
import type {
  Atom,
  Bond,
  CurvePoint,
  RenderedBond,
  SurfacePoint,
  Vector3Tuple,
  VectorSample3D,
} from "./types.js";

export interface SampledSurface {
  readonly points: readonly SurfacePoint[];
  readonly samples: number;
}

export interface SampledCurve3D {
  readonly segments: readonly (readonly CurvePoint[])[];
}

const finiteNumber = (value: number): boolean => Number.isFinite(value);

const finiteTuple3 = (point: readonly number[]): point is Vector3Tuple =>
  finiteNumber(point[0] ?? Number.NaN) &&
  finiteNumber(point[1] ?? Number.NaN) &&
  finiteNumber(point[2] ?? Number.NaN);

const sampleCount = (samples: number | undefined): number =>
  Math.max(2, Math.floor(samples ?? 32));

const lerpInterval = (range: Interval, index: number, count: number): number =>
  range.min + ((range.max - range.min) * index) / (count - 1);

const finiteAtom = (atom: Atom): boolean =>
  atom.id.length > 0 &&
  atom.element.length > 0 &&
  finiteTuple3(atom.position) &&
  (atom.radius === undefined || finiteNumber(atom.radius));

export const sampleSurface = (
  z: Function3D,
  region: Rect,
  samples?: number,
  colourMap: (z: number) => string = colourMapViridis,
): SampledSurface => {
  const count = sampleCount(samples);
  const rawPoints: Omit<SurfacePoint, "colour">[] = [];

  for (let row = 0; row < count; row += 1) {
    const y = lerpInterval(region.y, row, count);
    for (let column = 0; column < count; column += 1) {
      const x = lerpInterval(region.x, column, count);
      let height: number;
      try {
        height = z(x, y);
      } catch {
        continue;
      }
      if (!finiteNumber(height)) continue;
      rawPoints.push({ x, y, z: height, row, column });
    }
  }

  const heights = rawPoints.map((point) => point.z);
  const min = heights.length > 0 ? Math.min(...heights) : 0;
  const max = heights.length > 0 ? Math.max(...heights) : 1;
  const span = max - min;
  const points = rawPoints.map((point) => ({
    ...point,
    colour: colourMap(span === 0 ? 0.5 : (point.z - min) / span),
  }));

  return { points, samples: count };
};

export const sampleParametricCurve3D = (
  curve: ParametricCurve3D,
  t: Interval,
  samples?: number,
): SampledCurve3D => {
  const count = sampleCount(samples);
  const segments: CurvePoint[][] = [];
  let current: CurvePoint[] = [];

  for (let index = 0; index < count; index += 1) {
    const value = lerpInterval(t, index, count);
    let point: readonly [number, number, number];
    try {
      point = curve(value);
    } catch {
      if (current.length > 0) segments.push(current);
      current = [];
      continue;
    }

    if (!finiteTuple3(point)) {
      if (current.length > 0) segments.push(current);
      current = [];
      continue;
    }

    current.push({ x: point[0], y: point[1], z: point[2], t: value });
  }

  if (current.length > 0) segments.push(current);
  return { segments };
};

export const sampleVectorField3D = (
  field: VectorField3D,
  region: Box3,
  density?: number,
): readonly VectorSample3D[] => {
  const count = Math.max(2, Math.floor(density ?? 6));
  const samples: VectorSample3D[] = [];

  for (let xi = 0; xi < count; xi += 1) {
    const x = lerpInterval(region.x, xi, count);
    for (let yi = 0; yi < count; yi += 1) {
      const y = lerpInterval(region.y, yi, count);
      for (let zi = 0; zi < count; zi += 1) {
        const z = lerpInterval(region.z, zi, count);
        let vector: readonly [number, number, number];
        try {
          vector = field(x, y, z);
        } catch {
          continue;
        }
        if (!finiteTuple3(vector)) continue;
        samples.push({ x, y, z, vx: vector[0], vy: vector[1], vz: vector[2] });
      }
    }
  }

  return samples;
};

export const renderableAtoms = (atoms: readonly Atom[]): readonly Atom[] =>
  atoms.filter(finiteAtom);

export const renderableBonds = (
  atoms: readonly Atom[],
  bonds: readonly Bond[],
): readonly RenderedBond[] => {
  const atomById = new Map(renderableAtoms(atoms).map((atom) => [atom.id, atom]));

  return bonds.flatMap((bond) => {
    const from = atomById.get(bond.from);
    const to = atomById.get(bond.to);
    if (from === undefined || to === undefined) return [];
    const order = bond.order ?? 1;
    if (order !== 1 && order !== 2 && order !== 3) return [];
    return [{
      from,
      to,
      order,
      radius: bond.radius ?? 0.04,
      colour: bond.colour ?? "#667085",
    }];
  });
};
