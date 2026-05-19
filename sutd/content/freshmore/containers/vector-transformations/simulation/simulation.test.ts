import { definePredictionGateContract } from "../../../../../../testing/sim-harness/src/playwright-contract.js";

// prediction-gate: reveal must stay blocked until prediction commit.
definePredictionGateContract({
  simId: "sutd/freshmore/vector-transformations/vector-transformations-sim",
  predictionLabel: "3",
  rationale: "x' = 2(1) + 1(1) = 3 before y' is checked.",
  expectedText: ["Predicted first", "Computed result", "Invariant-direction check"],
});
