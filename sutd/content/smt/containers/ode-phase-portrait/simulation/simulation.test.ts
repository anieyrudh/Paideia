import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { expectProductSimulationReveal } from "../../../../../../testing/sim-harness/src/playwright-contract.js";

const simId = "sutd/smt/ode-phase-portrait/ode-phase-portrait";
const route = `/?sim=${simId}`;
const predictionOption = "Spiral inward toward the equilibrium";

test.describe("ODE Phase Portrait", () => {
  test("satisfies the product reveal visual contract", async ({ page }) => {
    await expectProductSimulationReveal(page, {
      simId,
      setup: [],
      prediction: {
        optionLabel: predictionOption,
        rationale: "Negative trace with positive determinant and Delta < 0 yields a stable inward spiral.",
      },
    });
  });

  test("prediction-checkpoint keeps phase evidence visible while saving reflection", async ({ page }) => {
    await page.goto(route);

    const observation = page.getByRole("region", { name: "Observation unlocked" });
    await expect(observation).toBeVisible();
    await expect(observation).toContainText("Phase portrait evidence");
    await expect(observation).toContainText("Formula trail");
    await expect(observation).toContainText("Trace formula: T = a + d");
    await expect(page.getByRole("form", { name: "Prediction checkpoint" })).toBeVisible();

    await page.getByRole("radio", { name: predictionOption }).check();
    await page
      .getByLabel("Rationale")
      .fill("The trace is negative and the determinant is positive, so nearby trajectories should damp inward.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    await expect(observation).toBeVisible();
  });

  test("manipulation changes the revealed stability classification", async ({ page }) => {
    await page.goto(route);

    await page.getByRole("combobox", { name: "Portrait preset" }).selectOption({ label: "Saddle" });

    const observation = page.getByRole("region", { name: "Observation unlocked" });
    await expect(observation).toContainText("Saddle");
    await expect(observation).toContainText("one direction approaches while another escapes");
  });

  test("has no critical accessibility violations after reveal", async ({ page }) => {
    await page.goto(route);

    await page.getByRole("radio", { name: predictionOption }).check();
    await page.getByLabel("Rationale").fill("Negative trace with positive determinant creates inward damping.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    await page.getByRole("region", { name: "Observation unlocked" }).waitFor();

    const results = await new AxeBuilder({ page }).analyze();
    const highImpactViolations = results.violations.filter(
      (violation) => violation.impact === "critical" || violation.impact === "serious",
    );

    expect(highImpactViolations).toEqual([]);
  });
});
