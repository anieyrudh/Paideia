import { definePredictionGateContract } from "../../../../../../testing/sim-harness/src/playwright-contract.js";

// prediction-gate: this sim must block component readouts until prediction commit.
definePredictionGateContract({
  simId: "a-level/physics/resolving-vectors/component-resolution",
  predictionLabel: "8.7 N",
  rationale: "The horizontal component is adjacent to the 30 degree angle, so cosine applies.",
  expectedText: ["Horizontal component", "8.7 N", "Formula used"],
});
