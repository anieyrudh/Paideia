import { definePredictionGateContract } from "../../../../../../testing/sim-harness/src/playwright-contract.js";

// prediction-gate: the lab must block calculated speed, unit reasoning, and dimensional checks until prediction commit.
definePredictionGateContract({
  simId: "a-level/physics/physical-quantities-and-units/measurement-uncertainty-lab",
  predictionLabel: "m s^-1",
  rationale: "Average speed is distance divided by time, so metres divide by seconds.",
  expectedText: ["Average speed", "m / s =", "distance + time"],
});
