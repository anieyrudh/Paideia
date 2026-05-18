import { definePredictionGateContract } from "../../../../../../testing/sim-harness/src/playwright-contract.js";

// prediction-gate: this sim must block dimensional verdicts until prediction commit.
definePredictionGateContract({
  simId: "a-level/physics/physical-quantities-and-units/dimensional-consistency-checker",
  predictionLabel: "kg m s^-1",
  rationale: "Mass times speed leaves only one factor of time in the denominator.",
  expectedText: ["Impossible as written", "kg m s^-1", "Unit reasoning"],
});
