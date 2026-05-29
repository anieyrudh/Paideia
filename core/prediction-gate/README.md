# @paideia/prediction-gate

Prediction-checkpoint support for PMOE-T simulations. The package owns the
commit contract, localStorage key scheme, and React checkpoint that records a
learner's expectation without hiding the simulation. Children render
immediately.

```tsx
import { PredictionGate } from "@paideia/prediction-gate";

export function OscillatorGate() {
  return (
    <PredictionGate
      packageId="simple-harmonic-motion"
      predict={{
        prompt: "What happens to the period when amplitude increases?",
        commit_format: {
          kind: "multiple-choice",
          options: ["increases", "stays the same", "decreases"],
        },
        rationale_required: true,
      }}
      simId="mass-spring"
    >
      <ObservedGraph />
    </PredictionGate>
  );
}
```

Lower-level helpers are available when a container needs to integrate the checkpoint
with its own UI:

```ts
import {
  clearPrediction,
  commitPrediction,
  isPredictionCommitted,
} from "@paideia/prediction-gate";

commitPrediction("simple-harmonic-motion", "package", {
  value: "stays the same",
  rationale: "Amplitude does not appear in the period formula.",
});

if (isPredictionCommitted("simple-harmonic-motion", "package")) {
  // render saved-prediction summary or learner reflection state
}

// Only call from an explicit reset action.
clearPrediction("simple-harmonic-motion", "package");
```

Storage is local-only under
`paideia.predict.<packageId>.<simId|"package">`. Consumers must not read or
write that key directly.

Compatibility exports `isRevealed` and `usePredictionGate` remain available
while older containers migrate, but they now mean "prediction committed", not
"observation may be shown".
