# @paideia/treatment-response

Deterministic dose-response primitives for Paideia simulations: Hill-form
dose-response, IC50 adjustment by a resistance factor, dose-at-target-response
inverse, and the therapeutic-index ratio. Curriculum-neutral and clinically
agnostic.

## Exports

- `Dose`, `IC50`, `HillCoefficient`, `ResponseFraction`, `ResistanceFactor`, `TherapeuticIndex`
- `DoseResponseInput`, `EffectiveIC50Input`, `DoseAtResponseInput`, `TherapeuticIndexInput`
- `dose`, `ic50`, `hillCoefficient`, `responseFraction`, `resistanceFactor`
- `hillDoseResponse`, `effectiveIC50`, `doseAtResponse`, `therapeuticIndex`

## Usage

```ts
import {
  dose,
  doseAtResponse,
  hillCoefficient,
  hillDoseResponse,
  ic50,
  resistanceFactor,
  responseFraction,
  effectiveIC50,
} from "@paideia/treatment-response";

const r = hillDoseResponse({
  dose: dose(20).value!,
  ic50: ic50(10).value!,
  hillCoefficient: hillCoefficient(2).value!,
});
// r.value = 0.8

const required = doseAtResponse({
  ic50: ic50(10).value!,
  hillCoefficient: hillCoefficient(2).value!,
  targetResponse: responseFraction(0.9).value!,
});
// required.value = 30 (dose for 90% response)
```

## Scope

Owns closed-form deterministic helpers. Does NOT model pharmacokinetics,
drug-drug interactions, patient outcomes, or any clinical recommendation.
