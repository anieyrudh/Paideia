# @paideia/gene-regulatory-network

Deterministic gene-expression kinetics for Paideia simulations: Hill
activation/repression regulators, transcription/translation rates, and a
single forward-Euler step for an mRNA + protein node.

## Exports

- `RateConstant`, `MolarConcentration`, `RegulationFactor`, `HillCoefficient`, `RegulatorKind`
- `Regulator`, `ExpressionState`, `ExpressionParams`, `ExpressionDerivatives`
- `rateConstant`, `molarConcentration`, `hillCoefficient`, `regulationFactor`
- `hillActivate`, `hillRepress`, `applyRegulator`
- `transcriptionRate`, `expressionDerivatives`, `stepGeneExpression`

## Usage

```ts
import {
  applyRegulator,
  hillCoefficient,
  molarConcentration,
  rateConstant,
  stepGeneExpression,
} from "@paideia/gene-regulatory-network";

const regulator = {
  kind: "activator" as const,
  inducer: molarConcentration(2).value!,
  threshold: molarConcentration(1).value!,
  hillCoefficient: hillCoefficient(2).value!,
};
const r = applyRegulator(regulator); // r.value ≈ 0.8

const next = stepGeneExpression(
  { mRna: molarConcentration(0).value!, protein: molarConcentration(0).value! },
  {
    basalTranscriptionRate: rateConstant(0.01).value!,
    maxTranscriptionRate: rateConstant(1).value!,
    translationRatePerMrna: rateConstant(2).value!,
    mRnaDegradationRate: rateConstant(0.1).value!,
    proteinDegradationRate: rateConstant(0.05).value!,
  },
  r.value!,
  0.1, // dt in seconds
);
```

## Scope

This module owns one-node deterministic kinetics. It deliberately does NOT
implement stochastic models (Gillespie), multi-node sparse-matrix
integration, post-transcriptional regulation, or any file-format parsing.
Each of those belongs in a separate kernel or out-of-scope.
