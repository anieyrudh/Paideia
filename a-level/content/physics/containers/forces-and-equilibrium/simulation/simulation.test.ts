import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import {
  definePredictionGateContract,
  mountSim,
} from "../../../../../../testing/sim-harness/src/playwright-contract.js";

const simId = "a-level/physics/forces-and-equilibrium/force-balance";

// prediction-checkpoint: force readouts and formula substitutions must stay hidden until commit.
definePredictionGateContract({
  simId,
  predictionLabel: "6 N right and 5 N up",
  rationale: "Each component must cancel its opposite force.",
  expectedText: ["Formula used", "Substitution: sum Fx"],
});

test.describe("Forces and Equilibrium", () => {
  test.beforeEach(async ({ page }) => {
    await mountSim(page, simId);
  });

  test("balanced preset makes both resultant components zero", async ({ page }) => {
    await page.getByRole("radio", { name: "6 N right and 5 N up" }).check();
    await page.getByLabel("Rationale").fill("Right support balances left pull; up support balances weight.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    await page.getByRole("button", { name: "balanced" }).click();

    const observation = page.getByLabel("Observation unlocked");
    await expect(observation).toContainText("0.0 N");
    await expect(observation).toContainText("equilibrium");
  });

  test("has no serious accessibility violations after reveal", async ({ page }) => {
    await page.getByRole("radio", { name: "6 N right and 5 N up" }).check();
    await page.getByLabel("Rationale").fill("The net force must be zero in x and y.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    await page.getByLabel("Observation unlocked").waitFor();

    const results = await new AxeBuilder({ page }).analyze();
    const seriousOrCritical = results.violations.filter(
      (violation) => violation.impact === "critical" || violation.impact === "serious",
    );

    expect(seriousOrCritical).toEqual([]);
  });
});
