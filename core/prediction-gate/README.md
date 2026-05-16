# @paideia/prediction-gate

Predict-before-reveal enforcement for PMOE-T simulations. The package owns the
commit contract, localStorage key scheme, and React gate that prevents Observe
or Explain UI from entering the DOM before a learner commits.

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

Lower-level helpers are available when a container needs to integrate the gate
with its own UI:

```ts
import {
  clearPrediction,
  commitPrediction,
  isRevealed,
} from "@paideia/prediction-gate";

commitPrediction("simple-harmonic-motion", "package", {
  value: "stays the same",
  rationale: "Amplitude does not appear in the period formula.",
});

if (isRevealed("simple-harmonic-motion", "package")) {
  // render observation
}

// Only call from an explicit reset action.
clearPrediction("simple-harmonic-motion", "package");
```

Storage is local-only under
`paideia.predict.<packageId>.<simId|"package">`. Consumers must not read or
write that key directly.
