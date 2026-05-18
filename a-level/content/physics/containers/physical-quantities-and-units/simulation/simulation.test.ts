// prediction-gate: this sim must block the quantity map and dimensional verdict until prediction commit.

import { definePredictionGateContract } from "../../../../../../testing/sim-harness/src/playwright-contract.js";

definePredictionGateContract({
  simId: "a-level/physics/physical-quantities-and-units/quantity-dependency-map",
  predictionLabel: "speed = distance / time",
  rationale: "Distance divided by time leaves metres per second, which is the unit for speed.",
  expectedText: ["Dependency graph lab", "Dimension: L T^-1", "dimensionally consistent"],
});
