# @paideia/immunology

Deterministic immunology primitives for Paideia simulations. Epitope-string
match affinity, Hill-form booster response, exponential immunity waning, and
SIR-compatible effective reproduction number and herd-immunity threshold.

## Exports

- `EpitopeSequence`, `AffinityScore`, `ImmunityLevel`, `DoseAmount`, `DecayRate`, `ReproductionNumber`
- `BoosterInput`, `WaningInput`, `HerdImmunityInput`
- `epitopeSequence`, `affinityScore`, `immunityLevel`, `doseAmount`, `decayRate`, `reproductionNumber`
- `matchAffinity`, `boosterResponse`, `waneImmunity`
- `effectiveReproductionNumber`, `herdImmunityThreshold`

## Usage

```ts
import {
  effectiveReproductionNumber,
  herdImmunityThreshold,
  immunityLevel,
  reproductionNumber,
} from "@paideia/immunology";

const r0 = reproductionNumber(3).value!;
const threshold = herdImmunityThreshold(r0);
// threshold.value ≈ 0.667; vaccinate 66.7 % of the population to push R_e to 1.

const re = effectiveReproductionNumber({
  baseR0: r0,
  immunityFraction: immunityLevel(0.5).value!,
});
// re.value ≈ 1.5; halfway-immune population sees R_e = 1.5.
```

## Scope

This kernel owns the closed-form helpers. Time-resolved SIR integration,
clonal-selection / BCR maturation dynamics, contact-network heterogeneity,
and vaccine-schedule logic are all out of scope.
