# @paideia/optimization Technical Notes

## Public interface

The package exports the contract declared in `AGENTS.md`: `Point2`, gradient trace types, 2D linear constraint/objective/result types, `optimizationTolerance`, `gradientDescent()`, `linearFeasibleRegion()`, and `optimizeLinearObjective()`.

## Implementation

`gradientDescent()` uses central finite differences over `Function3D` and records a `GradientSample` for the initial point plus each accepted step. It stops only when the gradient norm is within tolerance, when `maxSteps` is exhausted, or when the next point would leave the optional domain.

`linearFeasibleRegion()` converts the rectangular domain into four constraints, intersects every pair of constraint boundaries, keeps only candidates satisfying all constraints, de-duplicates within tolerance, and sorts the vertices around their centroid. `optimizeLinearObjective()` evaluates the supplied linear objective at every region vertex and reports the selected point plus active original constraint indices.

## Invariant enforcement

| Invariant | Enforcement |
| --- | --- |
| Finite points, bounds, coefficients, and objective values | Runtime guards returning `precondition-violated` or `undefined-at-point` |
| Ordered domains with `min < max` | `validateDomain()` before sampling or clipping |
| Non-zero constraint normals and objective vector | Runtime guards |
| No hidden mutable state | All arrays are local to the call; no module caches or counters |
| Input immutability | Inputs are typed readonly and copied into local arrays before sorting/filtering |
| LP vertices satisfy constraints | Pairwise intersection filter plus property-style tests |
| Conservative quadratic descent does not increase objective values | Property-style seeded test loop |

## Dependency and license notes

Runtime dependencies: `@paideia/shared` only.

No GPL, AGPL, LGPL, SSPL, BUSL, or Commons-Clause dependency is bundled. The implementation is a clean-room, dependency-free kernel.

## Anieyrudh Filter pass

Potential P0: an animation could imply convergence because steps become visually small. Resolution: `gradientDescent()` marks convergence only from gradient norm, and the trace records `reason`.

Potential P0: an LP visualizer could shade a clipped viewport while claiming a global unbounded optimum. Resolution: `linearFeasibleRegion()` stores the clipping domain in the result, and the contract states that LP claims are domain-clipped.

Potential P0: UI code could recompute a different optimum from rounded display vertices. Resolution: `optimizeLinearObjective()` consumes the kernel region directly and reports active constraint indices for labels.
