import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import {
  definePredictionGateContract,
  mountSim,
} from "../../../../../../testing/sim-harness/src/playwright-contract.js";

const simId = "a-level/physics/projectile-motion/trajectory-parameter-lab";

// prediction-gate: the trajectory, range, and formula readout must not reveal before commit.
// The package jsdom contract checks the same gate quickly.
// This browser-level contract catches generated registry drift.
// Keep the id in sync with simulation.yaml.
definePredictionGateContract({
  simId,
  predictionLabel: "It stays constant if air resistance is ignored.",
  rationale: "Gravity has no horizontal component in this model.",
  expectedText: ["Range", "Time of flight", "Result: horizontal range"],
});

test.describe(`${simId} accessibility`, () => {
  test("has no serious accessibility violations after reveal", async ({ page }) => {
    await mountSim(page, simId);
    await expect(page.getByLabel("Observation unlocked")).toHaveCount(0);
    await page.getByLabel("It stays constant if air resistance is ignored.").check();
    await page.getByLabel("Rationale").fill("Gravity has no horizontal component in this model.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    await expect(page.getByLabel("Observation unlocked")).toBeVisible();

    const results = await new AxeBuilder({ page }).analyze();
    const seriousOrCritical = results.violations.filter(
      (violation) => violation.impact === "critical" || violation.impact === "serious",
    );

    expect(seriousOrCritical).toEqual([]);
  });
});
