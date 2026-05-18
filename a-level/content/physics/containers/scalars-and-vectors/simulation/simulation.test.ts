// prediction-gate contract: mounted by the generic browser sim harness.

import { definePredictionGateContract } from "../../../../../../testing/sim-harness/src/playwright-contract.js";

definePredictionGateContract({
  simId: "a-level/physics/scalars-and-vectors/resultant-magnitude",
  predictionLabel: "7.1 m",
  rationale: "Perpendicular arrows should form a right triangle, not a straight line.",
  expectedText: ["Geometric resultant", "7.1 m", "10.0 m"],
});
