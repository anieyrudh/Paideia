// prediction-gate contract: mounted by the generic browser sim harness.

import { definePredictionGateContract } from "../../../../../../testing/sim-harness/src/playwright-contract.js";

definePredictionGateContract({
  simId: "a-level/physics/physical-quantities-and-units/measurement-uncertainty-lab",
  predictionLabel: "The reading spread between students",
  rationale: "The repeated readings disagree more than the smallest ruler division.",
  expectedText: ["Best estimate", "12.60 cm", "±0.20 cm"],
});
