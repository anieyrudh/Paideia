# core/ml-clustering · agent contract

## What this module is
The deterministic ML clustering kernel for Paideia simulations. It owns
teaching-scale k-means primitives with caller-provided centroids: squared
Euclidean distance, nearest-centroid assignment, centroid recomputation, and one
Lloyd step. It is pure TypeScript and returns `KernelResult` values for expected
invalid inputs.

## Public interface
Exports from `@paideia/ml-clustering`:

- `mlClusteringTolerance: { readonly default: number; readonly tight: number; readonly loose: number }`
- `type Vector`
- `type AssignToCentroidsInput`
- `type ClusterAssignment`
- `type AssignmentResult`
- `type RecomputeCentroidsInput`
- `type KMeansStepInput`
- `type KMeansStepResult`
- `squaredEuclideanDistance(a: Vector, b: Vector): KernelResult<number>`
- `assignToCentroids(input: AssignToCentroidsInput): KernelResult<AssignmentResult>`
- `recomputeCentroids(input: RecomputeCentroidsInput): KernelResult<readonly Vector[]>`
- `kMeansStep(input: KMeansStepInput): KernelResult<KMeansStepResult>`

## Invariants the caller must preserve
- Vectors are non-empty finite numeric arrays with consistent dimension.
- Centroids are supplied by the caller; this kernel does not initialise them.
- Assignment tie-breaks use the first nearest centroid by input order.
- Empty clusters keep their zero accumulator in recomputation and should be
  handled by the consuming teaching flow.

## What this module does NOT do
- Does **not** add randomness, k-means++ initialisation, train/test splitting, or
  iterative convergence loops.
- Does **not** import ML frameworks or numerical packages.
- Does **not** hide branch-specific datasets, feature scaling, or presets.

## When to consider this module
Use `core/ml-clustering` when a sim needs deterministic nearest-centroid
assignment, centroid recomputation, or a single k-means step. If a sim needs
random initialisation, convergence management, or a full ML framework, define a
separate future contract.

## Extension protocol
1. Open a `core-change-proposal` issue naming every current clustering sim that
   would consume the new primitive.
2. Add property tests for every new distance or inertia invariant.
3. Use `core!:` for public API changes that alter tie-breaking, empty-cluster,
   or distance semantics.

## Anti-patterns
- Adding hidden randomness or iterative training loops.
- Mutating caller-provided vectors.
- Silently accepting mixed vector dimensions.
- Adding branch-specific feature scaling.

## How the Anieyrudh Filter reads this module
The Filter checks that clustering visuals report assignments, centroids, and
inertia consistent with this deterministic kernel. It rejects visuals that imply
random initialisation or convergence behavior this kernel does not own.
