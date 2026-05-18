// prediction-gate contract: mounted by the generic browser sim harness.

import { definePredictionGateContract } from "../../../../../../testing/sim-harness/src/playwright-contract.js";

definePredictionGateContract({
  simId: "a-level/physics/physical-quantities-and-units/dimensional-consistency-checker",
  predictionLabel: "distance = speed + time",
  rationale: "Speed and time describe different kinds of physical quantity, so their units cannot be added.",
  expectedText: ["Let the units judge the equation", "Impossible as written", "Dimension", "base", "derived"],
});
