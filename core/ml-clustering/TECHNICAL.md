# @paideia/ml-clustering Technical Notes

## Public interface

The package exports exactly the symbols listed in `AGENTS.md`: vector and result
types plus pure kernel functions for squared Euclidean distance,
nearest-centroid assignment, centroid recomputation, and one k-means step.

## Numerical model

```text
d(x, c)^2 = sum_j (x_j - c_j)^2
assignment(x_i) = first centroid with minimum squared distance
centroid_k = mean(points assigned to k)
inertia = sum_i d(x_i, assigned_centroid_i)^2
```

## Invariant enforcement

| Invariant | Enforcement |
| --- | --- |
| Non-empty finite vectors with consistent dimension | `validateVector` / `validatePointSet` return `precondition-violated` |
| Cluster count is positive | `recomputeCentroids` returns `precondition-violated` |
| Assignment indices are in range | `recomputeCentroids` returns `precondition-violated` |
| Compound results and arrays are immutable | `Object.freeze` |
| Non-finite distances are rejected | `squaredEuclideanDistance` returns `numerical-instability` |

## Tests

The Vitest suite covers assignment, centroid recomputation, one-step behavior,
invalid input paths, immutable results, and a property test that squared
distances are non-negative.

## Dependency and license notes

Runtime dependencies:

- `@paideia/shared` - workspace package.

No external runtime dependency was added, so `LICENSES.json` did not need a new
allowlist entry and no clean-room process was required.

## P2 follow-ups

- Add deterministic convergence loops only after a consuming container defines
  iteration limits and stopping criteria.
- Add silhouette or cluster-quality metrics after a container defines distance
  semantics.
- Add k-means++ only if randomness is injected by the caller and fully logged.

## Anieyrudh Filter pass

- P0 issues checked: no hidden randomness, no ML framework dependency, no
  training loop, no branch-specific presets, no hidden mutable global state, no
  public `any`.
- P1 issues checked: public API is deliberately narrow, expected failures
  return `KernelResult.err`, tie-breaking and empty-cluster behavior are
  documented, and result arrays are immutable.
- High-bandwidth questions surfaced: random initialisation, convergence loops,
  feature scaling, silhouette metrics, and full ML framework behavior are
  intentionally deferred until consuming containers define the contract.
- Outcome: the kernel provides canonical deterministic clustering numbers for
  ML teaching visuals.
