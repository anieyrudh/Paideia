// prediction-gate contract: mounted by the generic browser sim harness.

import { definePredictionGateContract } from "../../../../../../testing/sim-harness/src/playwright-contract.js";

definePredictionGateContract({
  simId: "a-level/physics/physical-quantities-and-units/unit-classification-lab",
  predictionLabel: "The unit describes speed, not acceleration.",
  rationale: "Acceleration needs one more per second than speed.",
  expectedText: ["Unit Classification Lab", "Observation unlocked", "m s^-2", "units clash"],
});
