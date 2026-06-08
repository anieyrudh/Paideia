# @paideia/three-scene Technical Notes

## Status

This package implements the `core/three-scene` platform kernel contract with React-Three-Fiber, Three.js, and drei. The package owns the 3D dependency boundary; consuming shells should import it through `@paideia/three-scene/lazy` or a dynamically loaded sim chunk.

The exported React components construct inspectable R3F scene objects. Tests inspect React element trees and pure sampling/projection helpers instead of booting a WebGL context in Vitest.

## Public Surface

The package entry exports exactly the contract symbols:

- Components: `ThreeScene`, `Surface3D`, `ParametricCurve3DView`, `VectorField3DView`, `Molecule3D`, `Axes3D`
- Types: `Atom`, `Bond`, `CameraSpec`
- Helpers: `colourMapViridis`, `colourMapPlasma`

The `./lazy` entry wraps every component with `React.lazy` and re-exports the colour helpers and public types.

## Sampling

Surface sampling uses an inclusive rectangular grid. `samples` is floored and clamped to at least two points per axis. The sampler catches thrown function evaluations and drops non-finite values.

Parametric curves are sampled over an inclusive interval. Invalid points terminate the current segment, preserving visible gaps.

Vector fields sample an inclusive 3D grid. Vectors with thrown or non-finite components are omitted.

Molecule rendering data is derived from finite atoms only; bonds with missing or invalid endpoints are omitted.

## Dependencies

- `three` — MIT
- `@react-three/fiber` — MIT
- `@react-three/drei` — MIT
- `@types/three` — MIT, development only

All runtime dependency licenses are allowed by `LICENSES.json`.

## Geometry Truth

Projection uses a single isotropic span across x/y/z so equal physical distances keep equal scale. Undefined surface samples, curve samples, vector samples, and invalid molecule atoms/bonds are dropped; the renderer does not clamp or fabricate geometry.

## Anieyrudh Filter pass

- P0 issues + resolution: resolved the placeholder-renderer issue by wiring `ThreeScene` to `Canvas`, lights, and drei controls; resolved anisotropic projection by switching to a shared scale across axes.
- P1 issues + resolution: replaced fallback-only component tests with tests for Canvas setup, R3F objects, domain holes, molecule filtering, and isotropic projection.
- High-bandwidth questions surfaced: future PRs should decide whether molecules need true cylinder bonds instead of line primitives once a chemistry container requires bond thickness semantics.
