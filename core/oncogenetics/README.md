# @paideia/oncogenetics

Deterministic clonal-evolution primitives for Paideia simulations: driver /
passenger mutation bookkeeping, `(1 + s)^k` relative fitness, multi-hit
probability approximation, and closed-form clonal growth.

## Exports

- `MutationCount`, `FitnessAdvantage`, `MutationRatePerCellDivision`, `CellPopulationSize`, `RelativeFitness`, `HitProbability`
- `CloneState`, `MultiHitInput`, `ClonalGrowthInput`, `CompareClonalGrowthResult`
- `mutationCount`, `fitnessAdvantage`, `mutationRate`, `cellPopulationSize`
- `relativeFitness`, `multiHitProbability`
- `clonalGrowthAfterGenerations`, `compareClonalGrowth`

## Usage

```ts
import {
  cellPopulationSize,
  clonalGrowthAfterGenerations,
  fitnessAdvantage,
  mutationCount,
} from "@paideia/oncogenetics";

const grown = clonalGrowthAfterGenerations({
  clone: {
    drivers: mutationCount(3).value!,
    passengers: mutationCount(2).value!,
    size: cellPopulationSize(100).value!,
  },
  perDriverAdvantage: fitnessAdvantage(0.1).value!,
  generations: 20,
});
// grown.value = 100 * (1.1^3)^20 ≈ 9.74e3
```

## Scope

Owns closed-form deterministic formulas. Does NOT sample random variables,
integrate age-specific incidence, model spatial tumour growth, recommend
treatment, or parse clinical datasets.
