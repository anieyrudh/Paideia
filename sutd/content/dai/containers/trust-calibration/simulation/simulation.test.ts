import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { expectProductSimulationReveal } from "../../../../../../testing/sim-harness/src/playwright-contract.js";

test.describe("Trust Calibration", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/?sim=sutd/dai/trust-calibration/trust-calibration");
  });

  test("satisfies the product reveal visual contract", async ({ page }) => {
    await expectProductSimulationReveal(page, {
      simId: "sutd/dai/trust-calibration/trust-calibration",
      setup: [
        { role: "button", name: "Choose trust policy" },
        { role: "button", name: "Reveal policy cost" },
      ],
      prediction: {
        optionLabel: "70% threshold",
        rationale: "A middle threshold reduces wrong automated decisions without reviewing everything.",
      },
    });
  });

  test("prediction-gate blocks policy cost until commit", async ({ page }) => {
    await expect(page.getByRole("region", { name: "Observation unlocked" })).toHaveCount(0);

    await page.getByRole("button", { name: "Choose trust policy" }).click();
    await page.getByRole("button", { name: "Reveal policy cost" }).click();

    await expect(page.getByRole("form", { name: "Prediction gate" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Observation unlocked" })).toHaveCount(0);

    await page.getByRole("radio", { name: "70% threshold" }).check();
    await page
      .getByLabel("Rationale")
      .fill("A middle threshold should reduce wrong automated decisions without reviewing everything.");
    await page.getByRole("button", { name: "Commit prediction" }).click();

    const observation = page.getByRole("region", { name: "Observation unlocked" });
    await expect(observation).toBeVisible();
    await expect(observation).toContainText("Trust calibration evidence");
    await expect(observation).toContainText("Formula used: total cost");
  });

  test("manipulating the threshold changes accepted coverage", async ({ page }) => {
    await page.getByRole("button", { name: "Choose trust policy" }).click();
    await page.getByRole("slider", { name: "Automation confidence threshold" }).fill("85");
    await page.getByRole("button", { name: "Reveal policy cost" }).click();
    await page.getByRole("radio", { name: "85% threshold" }).check();
    await page.getByLabel("Rationale").fill("High threshold should reduce automation risk.");
    await page.getByRole("button", { name: "Commit prediction" }).click();

    const observation = page.getByRole("region", { name: "Observation unlocked" });
    await expect(observation).toContainText("Threshold 85% accepts 2 cases");
    await expect(observation).toContainText("total expected cost");
  });

  test("has no critical accessibility violations after reveal", async ({ page }) => {
    await page.getByRole("button", { name: "Choose trust policy" }).click();
    await page.getByRole("button", { name: "Reveal policy cost" }).click();
    await page.getByRole("radio", { name: "70% threshold" }).check();
    await page.getByLabel("Rationale").fill("Cost matters more than confidence alone.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    await page.getByRole("region", { name: "Observation unlocked" }).waitFor();

    const results = await new AxeBuilder({ page }).analyze();
    const criticalViolations = results.violations.filter(
      (violation) => violation.impact === "critical",
    );

    expect(criticalViolations).toEqual([]);
  });
});
