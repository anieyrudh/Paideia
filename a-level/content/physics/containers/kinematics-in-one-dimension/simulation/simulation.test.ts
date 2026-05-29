import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import {
  definePredictionGateContract,
  expectProductSimulationReveal,
  mountSim,
} from "../../../../../../testing/sim-harness/src/playwright-contract.js";

const simId = "a-level/physics/kinematics-in-one-dimension/motion-equations-lab";

// prediction-gate: the motion trace and formula readout must not reveal before commit.
// The package jsdom contract checks the same gate quickly.
// This browser-level contract catches generated registry drift.
// Keep the id in sync with simulation.yaml.
definePredictionGateContract({
  simId,
  predictionLabel: "9.0 m",
  rationale: "Starting from rest means the displacement comes from the acceleration term.",
  expectedText: ["Displacement", "9.00 m", "Substitution: s"],
});

test.describe(`${simId} accessibility`, () => {
  test("satisfies the product reveal visual contract", async ({ page }) => {
    await expectProductSimulationReveal(page, {
      simId,
      prediction: {
        optionLabel: "9.0 m",
        rationale: "Starting from rest means the displacement comes from the acceleration term.",
      },
    });
  });

  test("has no serious accessibility violations after reveal", async ({ page }) => {
    await mountSim(page, simId);
    await page.getByLabel("9.0 m").check();
    await page
      .getByLabel("Rationale")
      .fill("Starting from rest means the displacement comes from the acceleration term.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    await page.getByLabel("Observation unlocked").waitFor();

    const results = await new AxeBuilder({ page }).analyze();
    const seriousOrCritical = results.violations.filter(
      (violation) => violation.impact === "critical" || violation.impact === "serious",
    );

    expect(seriousOrCritical).toEqual([]);
  });
});
