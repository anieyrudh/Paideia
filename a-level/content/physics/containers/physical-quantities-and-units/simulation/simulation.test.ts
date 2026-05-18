import { definePredictionGateContract } from "../../../../../../testing/sim-harness/src/playwright-contract.js";

// prediction-gate: this sim must block the quantity map verdict until prediction commit.
definePredictionGateContract({
  simId: "a-level/physics/physical-quantities-and-units/quantity-map-lab",
  predictionLabel: "mass + length + time^-2",
  rationale: "Force is mass times acceleration, and acceleration is length per time squared.",
  expectedText: ["Quantity dependency map", "dimensionally consistent", "M L T^-2"],
});
