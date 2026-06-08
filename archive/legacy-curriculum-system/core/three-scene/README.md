# @paideia/three-scene

Typed 3D scene primitives for Paideia simulations. The public entry exports the recurring 3D views used by concept containers:

- `ThreeScene`
- `Surface3D`
- `ParametricCurve3DView`
- `VectorField3DView`
- `Molecule3D`
- `Axes3D`
- `colourMapViridis`
- `colourMapPlasma`
- `Atom`, `Bond`, and `CameraSpec` types

Consumers that render 3D content should prefer the lazy entry:

```ts
import { Surface3D, ThreeScene } from "@paideia/three-scene/lazy";
```

The implementation uses React-Three-Fiber, Three.js, and drei inside this package boundary. Catalogue and shell code should import the lazy entry, or load 3D sims in a dynamic route chunk, so the Three.js payload is not part of non-3D pages.

## Geometry Rules

`Surface3D`, `ParametricCurve3DView`, and `VectorField3DView` sample pure functions from `@paideia/shared`. Any thrown, `NaN`, or infinite sample is dropped instead of clamped or fabricated.

`Molecule3D` renders only finite atoms and only bonds whose endpoints resolve to valid atoms.

Projection helpers use one isotropic scale across x/y/z spans. A long rectangular domain changes framing, not the physical scale of one unit.

## Commands

```sh
pnpm -F @paideia/three-scene test
pnpm -F @paideia/three-scene build
pnpm -F @paideia/three-scene typecheck
```
