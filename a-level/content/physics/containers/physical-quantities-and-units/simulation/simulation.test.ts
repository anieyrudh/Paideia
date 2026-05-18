// prediction-gate contract: mounted by the generic browser sim harness.

import { definePredictionGateContract } from "../../../../../../testing/sim-harness/src/playwright-contract.js";

definePredictionGateContract({
  simId: "a-level/physics/physical-quantities-and-units/quantity-dependency-map",
  predictionLabel: "force → mass and acceleration → length and time",
  rationale: "Force depends on mass and acceleration, and acceleration depends on length and time.",
  expectedText: ["Quantity map lab", "Unit reasoning panel", "kg m s^-2"],
});
