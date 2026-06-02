import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { expectProductSimulationReveal } from "../../../../../../testing/sim-harness/src/playwright-contract.js";

const simId = "sutd/dai/fairness-threshold-audit/fairness-threshold-audit";
const route = `/?sim=${simId}`;
const predictionOption = "The group with lower recall can carry more missed-support harm";

test.describe("Fairness Threshold Audit", () => {
  test("satisfies the product reveal visual contract", async ({ page }) => {
    await expectProductSimulationReveal(page, {
      simId,
      setup: [],
      prediction: {
        optionLabel: predictionOption,
        rationale: "Equal thresholds rarely produce equal recall across groups.",
      },
    });
  });

  test("prediction-checkpoint keeps the group audit visible while saving reflection", async ({ page }) => {
    await page.goto(route);

    const observation = page.getByRole("region", { name: "Observation unlocked" });
    await expect(observation).toBeVisible();
    await expect(observation).toContainText("Recall gap 40.0 percentage points");
    await expect(observation).toContainText("harm gap 50 cost units");
    await expect(page.getByRole("form", { name: "Prediction checkpoint" })).toBeVisible();

    await page.getByRole("radio", { name: predictionOption }).check();
    await page
      .getByLabel("Rationale")
      .fill("The same threshold can create different false-negative counts for each group.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    await expect(observation).toBeVisible();
  });

  test("manipulating Group B's threshold visibly changes the audit gap", async ({ page }) => {
    await page.goto(route);

    await page.getByRole("button", { name: "Lower Group B threshold" }).click();

    const observation = page.getByRole("region", { name: "Observation unlocked" });
    await expect(observation).toContainText("Recall gap 0.0 percentage points");
    await expect(observation).toContainText("harm gap 0 cost units");
    await expect(page.getByRole("article", { name: "Group B audit result" })).toContainText("Threshold: 60%");
  });

  test("shows formula legend, stakeholder annotation, and critical accessibility is clean", async ({ page }) => {
    await page.goto(route);

    await expect(page.getByRole("region", { name: "Formula and substitution" })).toContainText(
      "Recall_g = TP_g / (TP_g + FN_g)",
    );
    await expect(page.getByRole("region", { name: "Formula and substitution" })).toContainText("cost units");
    await expect(page.getByRole("region", { name: "Formula and substitution" })).toContainText("Units:");
    await expect(page.getByRole("img", { name: "Group recall threshold curve" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Stakeholder annotation" })).toContainText(
      "miss support for one group more often",
    );

    const results = await new AxeBuilder({ page }).analyze();
    const criticalViolations = results.violations.filter(
      (violation) => violation.impact === "critical",
    );

    expect(criticalViolations).toEqual([]);
  });
});
