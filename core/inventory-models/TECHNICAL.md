# @paideia/inventory-models technical note

## Public Surface

The public surface is exactly the symbols listed in `AGENTS.md`: branded
inventory quantities, demand rates, demand standard deviations, lead times,
costs, z-scores, EOQ analysis, total annual cost, safety stock, and reorder
point helpers.

## Invariant Enforcement

| Invariant | Mechanism |
| --- | --- |
| Demand rate, order cost, holding cost, order quantity, and lead time are positive | Constructor guards and function revalidation. |
| Inventory quantities, demand standard deviations, unit costs, and safety stock are non-negative | Constructor guards and function revalidation. |
| Service-level safety stock cannot imply negative or infinite z-scores | `checkedServiceLevel` requires `[0.5, 1)`. |
| Public cost outputs never contain `NaN` or `Infinity` | `checkedCost` rejects non-finite or negative results. |
| EOQ cost breakdown uses the same formula inputs as the EOQ | `economicOrderQuantity` delegates the cost breakdown to `totalAnnualCost`. |
| Reorder point matches the displayed components | `reorderPoint` returns expected lead-time demand, safety stock, and their sum. |
| Inputs are not mutated | Public functions only read scalar branded values and allocate fresh records. |

## Error Model

- `out-of-domain`: non-finite, negative, zero-where-positive, or impossible
  service-level inputs.
- `numerical-instability`: derived costs become non-finite or negative after
  arithmetic.
- `precondition-violated`: reserved for future caller-contract violations that
  are not simple numeric domains.

## Dependencies

Runtime dependencies:

- `@paideia/shared` for `Brand`, `KernelResult`, `Probability`, `ok`, `err`,
  and probability guards.

Dev-only dependencies:

- `vitest`
- `fast-check`
- `typescript`

No external runtime inventory, statistics, forecasting, or simulation package is
bundled. Newsvendor critical-fractile coverage remains in `@paideia/optimization`.

## Numerical Notes

The service-level helper uses a deterministic rational approximation for the
inverse standard normal CDF. It is appropriate for teaching safety-stock
targets and avoids adding a runtime statistics dependency. The package does not
estimate demand variance; callers must supply demand standard deviation in the
same period basis as lead time.

## Test Strategy

Unit tests cover constructor success/failure, EOQ values, annual-cost
components, safety-stock calculations from z-score and service level, rejected
service levels, and reorder-point calculations. Property tests assert that EOQ
does not exceed sampled neighboring relevant costs and that reorder point is
monotone in safety stock.

## Anieyrudh Filter pass

P0 issues + resolution:

- P0 check: hidden randomness in safety-stock or demand behaviour. Resolution:
  the kernel never samples demand; it only transforms caller-supplied
  parameters with deterministic formulas.
- P0 check: UI could show cost components from formulas that differ from EOQ.
  Resolution: `economicOrderQuantity` obtains ordering and holding cost from
  `totalAnnualCost`, so labels and totals share the same arithmetic path.

P1 issues + resolution-or-deferred-issue-link:

- P1 check: service level `1` could produce infinite safety stock. Resolution:
  `checkedServiceLevel` rejects values outside `[0.5, 1)`.
- P1 check: reorder-point displays could hide whether safety stock was included.
  Resolution: `reorderPoint` returns expected lead-time demand and safety stock
  separately alongside the total.
- P1 check: duplicate newsvendor kernels could drift. Resolution:
  `core/inventory-models` does not expose newsvendor logic because
  `core/optimization` already owns the discrete critical-fractile calculation.

High-bandwidth questions surfaced:

- Should a later queue row need continuous-distribution newsvendor or base-stock
  policies, add a separate contract change instead of widening this package
  opportunistically.

P2 cleanup:

- Deferred: add `core/inventory-models` to a broader generated core-module
  inventory if the documentation validator starts requiring catalogue updates.
