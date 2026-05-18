import { definePredictionGateContract } from "../../../../../../testing/sim-harness/src/playwright-contract.js";

// prediction-gate: the lab notebook must not reveal the complete speed record before commit.
definePredictionGateContract({
  simId: "a-level/physics/physical-quantities-and-units/measurement-uncertainty-lab",
  predictionLabel: "2.50 m s^-1 ± 0.09 m s^-1",
  rationale: "A complete measurement record needs value, unit, and uncertainty.",
  expectedText: ["Formula and unit reasoning", "v = 2.50 ± 0.09 m s^-1", "derived quantity"],
});
