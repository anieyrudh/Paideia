import { definePredictionGateContract } from "../../../../../../testing/sim-harness/src/playwright-contract.js";

// prediction-gate: the motion trace and formula readout must not reveal before commit.
// The package jsdom contract checks the same gate quickly.
// This browser-level contract catches generated registry drift.
// Keep the id in sync with simulation.yaml.
definePredictionGateContract({
  simId: "a-level/physics/kinematics-in-one-dimension/motion-equations-lab",
  predictionLabel: "9.0 m",
  rationale: "Starting from rest means the displacement comes from the acceleration term.",
  expectedText: ["Displacement", "9.00 m", "s = ut + 1/2 at^2"],
});
