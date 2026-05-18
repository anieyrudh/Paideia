import { definePredictionGateContract } from "../../../../../../testing/sim-harness/src/playwright-contract.js";

// prediction-gate: this lab must block quantity passports and dimensional checks until prediction commit.
definePredictionGateContract({
  simId: "a-level/physics/physical-quantities-and-units/unit-classification-lab",
  predictionLabel: "Trusting numbers before units",
  rationale: "I often start with the number before checking what the unit allows.",
  expectedText: ["Unit classification lab", "Formula used", "speed = distance ÷ time"],
});
