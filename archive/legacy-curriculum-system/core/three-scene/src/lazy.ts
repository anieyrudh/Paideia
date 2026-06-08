import { lazy } from "react";
import type { Atom, Bond, CameraSpec } from "./types.js";

export const ThreeScene = lazy(async () => ({
  default: (await import("./index.js")).ThreeScene,
}));

export const Surface3D = lazy(async () => ({
  default: (await import("./index.js")).Surface3D,
}));

export const ParametricCurve3DView = lazy(async () => ({
  default: (await import("./index.js")).ParametricCurve3DView,
}));

export const VectorField3DView = lazy(async () => ({
  default: (await import("./index.js")).VectorField3DView,
}));

export const Molecule3D = lazy(async () => ({
  default: (await import("./index.js")).Molecule3D,
}));

export const Axes3D = lazy(async () => ({
  default: (await import("./index.js")).Axes3D,
}));

export { colourMapPlasma, colourMapViridis } from "./colours.js";
export type { Atom, Bond, CameraSpec };
