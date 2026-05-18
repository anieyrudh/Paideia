import { definePredictionGateContract } from "../../../../../../testing/sim-harness/src/playwright-contract.js";

// prediction-gate: this sim must block the unit verdict and repair hint until prediction commit.
definePredictionGateContract({
  simId: "a-level/physics/physical-quantities-and-units/impossible-equation-detector",
  predictionLabel: "v = u + 1/2 at^2",
  rationale: "The at squared term should reduce to metres, which cannot be added to velocity.",
  observationLabel: "Impossible equation detector",
  expectedText: ["Impossible as written", "Unit reasoning", "Replace t^2 with t"],
});
