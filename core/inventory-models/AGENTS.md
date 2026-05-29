# core/inventory-models - agent contract

## What this module is

Pure deterministic inventory-policy helpers for educational operations
simulations. It owns EOQ, reorder point, safety stock from z-score or cycle
service level, and total annual cost calculations for single-item teaching
models. It returns readonly records only: no stochastic simulation, no
forecasting platform, no procurement workflow, no rendering, no persistence,
and no branch-specific behaviour.

## Public interface

Exports from `@paideia/inventory-models`:

- `InventoryUnits = Brand<number, "InventoryModels.InventoryUnits">`
- `DemandUnitsPerPeriod = Brand<number, "InventoryModels.DemandUnitsPerPeriod">`
- `DemandStdDevUnitsPerPeriod = Brand<number, "InventoryModels.DemandStdDevUnitsPerPeriod">`
- `LeadTimePeriods = Brand<number, "InventoryModels.LeadTimePeriods">`
- `CostPerOrder = Brand<number, "InventoryModels.CostPerOrder">`
- `HoldingCostPerUnitPerPeriod = Brand<number, "InventoryModels.HoldingCostPerUnitPerPeriod">`
- `UnitCost = Brand<number, "InventoryModels.UnitCost">`
- `CostPerPeriod = Brand<number, "InventoryModels.CostPerPeriod">`
- `ZScore = Brand<number, "InventoryModels.ZScore">`
- `EoqInput = { demandRate: DemandUnitsPerPeriod; orderCost: CostPerOrder; holdingCost: HoldingCostPerUnitPerPeriod }`
- `EoqAnalysis = { economicOrderQuantity: InventoryUnits; cycleCount: number; annualOrderingCost: CostPerPeriod; annualHoldingCost: CostPerPeriod; totalRelevantCost: CostPerPeriod }`
- `TotalAnnualCostInput = { demandRate: DemandUnitsPerPeriod; orderQuantity: InventoryUnits; orderCost: CostPerOrder; holdingCost: HoldingCostPerUnitPerPeriod; unitCost?: UnitCost }`
- `TotalAnnualCostAnalysis = { orderingCost: CostPerPeriod; holdingCost: CostPerPeriod; purchaseCost: CostPerPeriod | null; totalRelevantCost: CostPerPeriod; totalAnnualCost: CostPerPeriod }`
- `SafetyStockFromZInput = { zScore: ZScore; demandStandardDeviation: DemandStdDevUnitsPerPeriod; leadTime: LeadTimePeriods }`
- `SafetyStockFromServiceLevelInput = { serviceLevel: Probability; demandStandardDeviation: DemandStdDevUnitsPerPeriod; leadTime: LeadTimePeriods }`
- `SafetyStockAnalysis = { safetyStock: InventoryUnits; demandStandardDeviationDuringLeadTime: InventoryUnits; zScore: ZScore; serviceLevel: Probability | null }`
- `ReorderPointInput = { averageDemand: DemandUnitsPerPeriod; leadTime: LeadTimePeriods; safetyStock?: InventoryUnits }`
- `ReorderPointAnalysis = { expectedLeadTimeDemand: InventoryUnits; safetyStock: InventoryUnits; reorderPoint: InventoryUnits }`
- `inventoryUnits(value: number): KernelResult<InventoryUnits>`
- `demandUnitsPerPeriod(value: number): KernelResult<DemandUnitsPerPeriod>`
- `demandStdDevUnitsPerPeriod(value: number): KernelResult<DemandStdDevUnitsPerPeriod>`
- `leadTimePeriods(value: number): KernelResult<LeadTimePeriods>`
- `costPerOrder(value: number): KernelResult<CostPerOrder>`
- `holdingCostPerUnitPerPeriod(value: number): KernelResult<HoldingCostPerUnitPerPeriod>`
- `unitCost(value: number): KernelResult<UnitCost>`
- `costPerPeriod(value: number): KernelResult<CostPerPeriod>`
- `zScore(value: number): KernelResult<ZScore>`
- `economicOrderQuantity(input: EoqInput): KernelResult<EoqAnalysis>`
- `totalAnnualCost(input: TotalAnnualCostInput): KernelResult<TotalAnnualCostAnalysis>`
- `safetyStockFromZ(input: SafetyStockFromZInput): KernelResult<SafetyStockAnalysis>`
- `safetyStockFromServiceLevel(input: SafetyStockFromServiceLevelInput): KernelResult<SafetyStockAnalysis>`
- `reorderPoint(input: ReorderPointInput): KernelResult<ReorderPointAnalysis>`

## Invariants the caller must preserve

- Demand rate, order cost, holding cost, order quantity, and lead time must be
  finite and strictly positive.
- Inventory quantities, demand standard deviations, unit costs, and safety stock
  values must be finite and non-negative.
- z-scores for safety stock must be finite and non-negative.
- Cycle service levels for safety stock must be in `[0.5, 1)`, because lower
  values imply negative safety stock and `1` implies an infinite normal z-score.
- Public results must never contain `NaN` or `Infinity`.
- Callers must use one consistent time basis. If demand is annual, holding cost
  is per unit per year and lead time is in years.

Violations return `KernelResult.err("out-of-domain", ...)`,
`KernelResult.err("precondition-violated", ...)`, or
`KernelResult.err("numerical-instability", ...)`.

## What this module does NOT do

- Does not model stochastic sample paths, Monte Carlo demand, or random demand
  generation.
- Does not forecast demand, estimate demand variance, or read historical data.
- Does not solve multi-echelon, capacity-constrained, or supplier-allocation
  inventory problems.
- Does not own one-period newsvendor critical-fractile logic; use
  `@paideia/optimization` for the existing discrete newsvendor kernel.
- Does not render charts, dashboards, tables, or UI controls.
- Does not import branch-specific content or flags.

## When to consider this module

Use `core/inventory-models` when a container needs EOQ, order-cycle cost
breakdown, reorder point, or safety stock from a supplied demand variability and
z-score/service-level target. If a sim is about to inline `(D/Q)S + (Q/2)H`,
`sqrt(2DS/H)`, `z * sigma * sqrt(L)`, or `d * L + SS`, use this module instead.

Use `core/optimization` when a simulation needs the one-period discrete
newsvendor critical-fractile calculation over a demand distribution.

## Extension protocol

1. Open a `core-change-proposal` issue naming current consumers.
2. Wait for both branches' CI green (`core-changed.yml`).
3. Use `core!:` for changes to formula semantics, units, or public result
   shapes.

## Anti-patterns (will be rejected in PR review)

- Returning `NaN` or `Infinity` instead of `KernelResult.err(...)`.
- Treating zero holding cost, zero order cost, or zero order quantity as a valid
  EOQ/cost case.
- Hiding demand forecasts, random sampling, clocks, caches, or global mutable
  state inside the kernel.
- Mixing years, months, and days inside one call without caller-visible unit
  conversion.
- Duplicating the newsvendor critical-ratio kernel already owned by
  `core/optimization`.

## Minimal examples

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

## How the Anieyrudh Filter reads this module

The Filter probes that inventory visuals and explanations use exactly the
formula outputs returned here: EOQ labels must match the same demand, setup
cost, and holding cost; reorder-point markers must be `averageDemand * leadTime
+ safetyStock`; safety-stock displays must expose the selected z-score or
service level and the lead-time standard deviation; and cost summaries must not
silently omit purchase cost when `unitCost` is supplied.
