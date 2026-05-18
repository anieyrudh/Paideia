import { definePredictionGateContract } from "../../../../../../testing/sim-harness/src/playwright-contract.js";

// prediction-gate: the lab must not reveal classifications or equation checks before prediction commit.
definePredictionGateContract({
  simId: "a-level/physics/physical-quantities-and-units/unit-classification-lab",
  predictionLabel: "It is likely derived because the unit combines metre and second.",
  rationale: "The unit combines metre and seconds, so I expect the quantity is derived from base quantities.",
  expectedText: ["Unit Classification Lab", "Formula or unit reasoning", "Impossible-equation detector"],
});
