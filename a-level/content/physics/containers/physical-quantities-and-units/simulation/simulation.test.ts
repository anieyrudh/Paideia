// prediction-gate contract: mounted by the generic browser sim harness.

import { definePredictionGateContract } from "../../../../../../testing/sim-harness/src/playwright-contract.js";

definePredictionGateContract({
  simId: "a-level/physics/physical-quantities-and-units/impossible-equation-detector",
  predictionLabel: "invalid: one right-hand term is velocity",
  rationale: "The acceleration term needs another time factor before it can become displacement.",
  expectedText: ["Impossible-equation detector", "Impossible as written", "dimensions: L"],
});
