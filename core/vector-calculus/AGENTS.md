# core/vector-calculus - agent contract

## What this module is

Pure numerical vector-calculus kernels for multivariable-calculus simulations.
It owns finite-difference gradients, Hessians, divergence, curl, rectangular
double integrals, parametric line integrals, and vector-field sampling records.
It returns deterministic data only: no plotting, no React components, no 3D
scene state, and no symbolic algebra.

## Public interface

Exports from `@paideia/vector-calculus`:

- `vectorCalculusTolerance: { default: number; derivative: number; integral: number }`
- `Point2 = readonly [x: number, y: number]`
- `Vector2 = readonly [x: number, y: number]`
- `Matrix2 = readonly [readonly [number, number], readonly [number, number]]`
- `IntegrationRule2D = "midpoint" | "trapezoid"`
- `DerivativeOptions = { readonly h?: number }`
- `GridOptions = { readonly nx?: number; readonly ny?: number }`
- `ParametricBounds = { readonly min: number; readonly max: number }`
- `CurveSample2D = { readonly t: number; readonly point: Point2; readonly tangent: Vector2; readonly speed: number }`
- `Gradient2D = { readonly at: Point2; readonly value: Vector2; readonly magnitude: number }`
- `Hessian2D = { readonly at: Point2; readonly matrix: Matrix2 }`
- `Divergence2D = { readonly at: Point2; readonly value: number }`
- `Curl2D = { readonly at: Point2; readonly zComponent: number }`
- `RectIntegralSample2D = { readonly point: Point2; readonly value: number; readonly weight: number; readonly contribution: number }`
- `RectIntegral2D = { readonly value: number; readonly cells: number; readonly rule: IntegrationRule2D; readonly samples: readonly RectIntegralSample2D[] }`
- `LineIntegral2D = { readonly value: number; readonly samples: readonly CurveSample2D[]; readonly bounds: ParametricBounds; readonly steps: number }`
- `VectorFieldSample2D = { readonly point: Point2; readonly vector: Vector2; readonly magnitude: number }`
- `QuadraticSurfaceFamily2D = "bowl" | "saddle" | "tilted-valley"`
- `QuadraticSurfaceFamilyInput2D = { readonly family: QuadraticSurfaceFamily2D; readonly xCurvature: number; readonly yCurvature: number; readonly xyCoupling: number }`
- `QuadraticSurfaceCoefficients2D = { readonly xx: number; readonly yy: number; readonly xy: number; readonly x: number; readonly y: number; readonly constant: number }`
- `QuadraticSurfaceAtInput2D = { readonly coefficients: QuadraticSurfaceCoefficients2D; readonly point: Point2 }`
- `QuadraticSurfaceAt2D = { readonly point: Point2; readonly value: number; readonly gradient: Gradient2D; readonly hessian: Hessian2D }`
- `DirectionalDerivativeInput2D = { readonly gradient: Gradient2D; readonly direction: Vector2 }`
- `DirectionalDerivative2D = { readonly at: Point2; readonly unitDirection: Vector2; readonly value: number }`
- `point2(x: number, y: number): KernelResult<Point2>`
- `quadraticSurfaceCoefficients2D(input: QuadraticSurfaceFamilyInput2D): KernelResult<QuadraticSurfaceCoefficients2D>`
- `quadraticSurfaceAt2D(input: QuadraticSurfaceAtInput2D): KernelResult<QuadraticSurfaceAt2D>`
- `directionalDerivative2D(input: DirectionalDerivativeInput2D): KernelResult<DirectionalDerivative2D>`
- `gradient2D(field: Function3D, at: Point2, opts?: DerivativeOptions): KernelResult<Gradient2D>`
- `hessian2D(field: Function3D, at: Point2, opts?: DerivativeOptions): KernelResult<Hessian2D>`
- `divergence2D(field: VectorField2D, at: Point2, opts?: DerivativeOptions): KernelResult<Divergence2D>`
- `curl2D(field: VectorField2D, at: Point2, opts?: DerivativeOptions): KernelResult<Curl2D>`
- `doubleIntegralRect(field: Function3D, rect: Rect, opts?: GridOptions & { readonly rule?: IntegrationRule2D }): KernelResult<RectIntegral2D>`
- `lineIntegral2D(field: VectorField2D, curve: ParametricCurve2D, bounds: ParametricBounds, opts?: { readonly steps?: number; readonly h?: number }): KernelResult<LineIntegral2D>`
- `scalarLineIntegral2D(field: Function3D, curve: ParametricCurve2D, bounds: ParametricBounds, opts?: { readonly steps?: number; readonly h?: number }): KernelResult<LineIntegral2D>`
- `sampleVectorField2D(field: VectorField2D, rect: Rect, opts?: GridOptions): KernelResult<readonly VectorFieldSample2D[]>`

## Invariants the caller must preserve

- Scalar fields, vector fields, and parametric curves are pure functions.
- Coordinates, bounds, sample counts, and derivative steps are finite.
- Derivative step `h` is positive and large enough to change the sampled point.
- Rectangles have `min < max` on both axes.
- Grid counts and line-integral step counts are positive integers.
- Vector fields return exactly two finite components.
- Curves return exactly two finite coordinates.
- Quadratic-surface coefficients and directional-derivative directions are finite;
  directions have positive magnitude.

Violations return `KernelResult.err("precondition-violated", ...)`,
`KernelResult.err("undefined-at-point", ...)`, or
`KernelResult.err("numerical-instability", ...)`.

## What this module does NOT do

- Does not render surfaces, contours, vector fields, or path diagrams.
- Does not do symbolic partial derivatives, exact integration, or CAS-style
  simplification.
- Does not solve PDEs or classify vector-field topology.
- Does not memoise user functions or hide global sampling caches.
- Does not branch by curriculum, institution, or syllabus.

## When to consider this module

Use `core/vector-calculus` when a sim needs canonical gradients, directional
derivatives, quadratic-surface evidence, tangent-plane evidence, Hessian
curvature, divergence/curl probes, line-integral work, scalar path integrals,
rectangular double integrals, or sampled vector-field arrows.
If a multivariable sim is about to inline finite differences, path work, curl,
or divergence, use this module instead.

## Extension protocol

1. Open a `core-change-proposal` issue naming every current consumer.
2. Add tests for the old and new numerical semantics.
3. Use `core!:` for public type changes, tolerance changes, or integration-rule
   semantics.

## Anti-patterns (will be rejected in PR review)

- Returning `NaN` or `Infinity` instead of `KernelResult.err(...)`.
- Mutating caller-owned arrays.
- Hidden global caches of sampled fields or curves.
- Rendering plots, contours, arrows, or diagrams from this package.
- Silently swallowing exceptions from user-supplied functions.

## How the Anieyrudh Filter reads this module

The Filter checks that a visible gradient arrow, curl/divergence probe, path
work readout, or double-integral accumulation is computed from this kernel's
returned data. A sim whose diagram and formula panel disagree with
`gradient2D`, `curl2D`, `lineIntegral2D`, or `doubleIntegralRect` fails review.
