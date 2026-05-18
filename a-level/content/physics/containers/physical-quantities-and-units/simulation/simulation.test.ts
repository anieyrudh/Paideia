// prediction-gate contract: mounted by the generic browser sim harness.

import { definePredictionGateContract } from "../../../../../../testing/sim-harness/src/playwright-contract.js";

definePredictionGateContract({
  simId: "a-level/physics/physical-quantities-and-units/impossible-equation-detector",
  predictionLabel: "distance = speed + acceleration",
  rationale: "Speed and acceleration have different powers of seconds, so they cannot be added.",
  expectedText: ["Impossible as written", "L T^-2 is not L T^-1", "Rule of the lab"],
});
