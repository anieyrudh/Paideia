import type { Box3 } from "@paideia/shared";
import type { Atom, Point3D } from "./types.js";

export interface ProjectedPoint {
  readonly x: number;
  readonly y: number;
}

const span = (min: number, max: number): number => Math.max(1e-9, max - min);

export const projectPoint = (
  point: Point3D,
  box: Box3,
  width: number,
  height: number,
): ProjectedPoint => {
  const xMid = (box.x.min + box.x.max) / 2;
  const yMid = (box.y.min + box.y.max) / 2;
  const zMid = (box.z.min + box.z.max) / 2;
  const isotropicSpan = Math.max(
    span(box.x.min, box.x.max),
    span(box.y.min, box.y.max),
    span(box.z.min, box.z.max),
  );
  const nx = (point.x - xMid) / isotropicSpan;
  const ny = (point.y - yMid) / isotropicSpan;
  const nz = (point.z - zMid) / isotropicSpan;
  const scale = Math.min(width, height) * 0.72;

  return {
    x: width / 2 + (nx - nz) * scale * 0.82,
    y: height / 2 - ny * scale + (nx + nz) * scale * 0.32,
  };
};

export const boxFromAtoms = (atoms: readonly Atom[]): Box3 => {
  if (atoms.length === 0) {
    return {
      x: { min: -1, max: 1 },
      y: { min: -1, max: 1 },
      z: { min: -1, max: 1 },
    };
  }

  const xs = atoms.map((atom) => atom.position[0]);
  const ys = atoms.map((atom) => atom.position[1]);
  const zs = atoms.map((atom) => atom.position[2]);
  const pad = 0.7;

  return {
    x: { min: Math.min(...xs) - pad, max: Math.max(...xs) + pad },
    y: { min: Math.min(...ys) - pad, max: Math.max(...ys) + pad },
    z: { min: Math.min(...zs) - pad, max: Math.max(...zs) + pad },
  };
};
