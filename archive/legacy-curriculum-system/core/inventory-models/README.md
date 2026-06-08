# @paideia/inventory-models

Pure inventory-policy helpers for Paideia operations simulations.

Use this package when a container needs EOQ, total annual cost, reorder point,
or safety stock from a supplied z-score or service-level target.

```ts
import {
  costPerOrder,
  demandUnitsPerPeriod,
  economicOrderQuantity,
  holdingCostPerUnitPerPeriod,
} from "@paideia/inventory-models";

const demand = demandUnitsPerPeriod(1200);
const setup = costPerOrder(50);
const holding = holdingCostPerUnitPerPeriod(2);

if (demand.ok && setup.ok && holding.ok) {
  const eoq = economicOrderQuantity({
    demandRate: demand.value,
    orderCost: setup.value,
    holdingCost: holding.value,
  });
  console.log(eoq);
}
```

## Assumptions

- All values in one call use the same period basis. Annual demand needs annual
  holding cost and lead time expressed in years; weekly demand needs weekly
  holding cost and lead time expressed in weeks.
- EOQ uses the deterministic textbook formula `sqrt(2DS/H)`.
- Total annual cost reports relevant cost `(D/Q)S + (Q/2)H` and includes
  purchase cost only when `unitCost` is supplied.
- Safety stock uses `z * sigma * sqrt(leadTime)` with independent per-period
  demand variation supplied by the caller.
- Service-level safety stock converts a cycle service level in `[0.5, 1)` to a
  deterministic normal z-score approximation.
- One-period discrete newsvendor critical-fractile logic already lives in
  `@paideia/optimization`; this package does not duplicate it.
