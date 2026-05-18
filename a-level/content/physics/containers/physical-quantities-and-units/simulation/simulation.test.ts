// prediction-gate contract: mounted by the generic browser sim harness.

import { definePredictionGateContract } from "../../../../../../testing/sim-harness/src/playwright-contract.js";

definePredictionGateContract({
  simId: "a-level/physics/physical-quantities-and-units/dimensional-consistency-checker",
  predictionLabel: "s = vt + 1/2 at",
  rationale: "The acceleration term needs another factor of time to become a length.",
  expectedText: ["Units reject this equation", "Only like dimensions", "s = vt + 1/2 at"],
});
