import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { expectProductSimulationReveal } from "../../../../../../testing/sim-harness/src/playwright-contract.js";

const simId = "sutd/dai/confusion-matrix-thresholds/confusion-matrix-thresholds";
const route = `/?sim=${simId}`;
const predictionOption = "Recall falls, so missed-positive cost can rise";

test.describe("Confusion Matrix Thresholds", () => {
  test("satisfies the product reveal visual contract", async ({ page }) => {
    await expectProductSimulationReveal(page, {
      simId,
      setup: [],
      prediction: {
        optionLabel: predictionOption,
        rationale: "A higher threshold misses more positives when false negatives are costly.",
      },
    });
  });

  test("prediction-checkpoint keeps the confusion matrix visible while saving reflection", async ({ page }) => {
    await page.goto(route);

    const observation = page.getByRole("region", { name: "Observation unlocked" });
    await expect(observation).toBeVisible();
    await expect(observation).toContainText("Confusion matrix counts");
    await expect(observation).toContainText("Cost substitution");
    await expect(page.getByRole("form", { name: "Prediction checkpoint" })).toBeVisible();

    await page.getByRole("radio", { name: predictionOption }).check();
    await page
      .getByLabel("Rationale")
      .fill("A stricter threshold misses more actual positives when false negatives matter.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    await expect(observation).toBeVisible();
  });

  test("manipulating the threshold visibly changes recall and counts", async ({ page }) => {
    await page.goto(route);

    await page.getByRole("slider", { name: "Decision threshold" }).fill("80");

    const observation = page.getByRole("region", { name: "Observation unlocked" });
    await expect(observation).toContainText("Threshold 80% produces 156 cost units");
    await expect(page.getByRole("region", { name: "Confusion matrix counts" })).toContainText("FN");
    await expect(page.getByRole("region", { name: "Formula and substitution" })).toContainText(
      "6 cases x 25 cost units",
    );
  });

  test("shows formula legend and revealed-state accessibility is clean", async ({ page }) => {
    await page.goto(route);

    await expect(page.getByRole("region", { name: "Formula and substitution" })).toContainText(
      "Precision = TP / (TP + FP)",
    );
    await expect(page.getByRole("region", { name: "Formula and substitution" })).toContainText(
      "true positives",
    );
    await expect(page.getByRole("region", { name: "Formula and substitution" })).toContainText(
      "false positives",
    );
    await expect(page.getByRole("region", { name: "Formula and substitution" })).toContainText(
      "false negatives",
    );
    await expect(page.getByRole("region", { name: "Formula and substitution" })).toContainText(
      "Units:",
    );
    await expect(page.getByRole("img", { name: "Precision and recall threshold curve" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Stakeholder annotation" })).toContainText(
      "False negatives are missed positive cases",
    );

    const results = await new AxeBuilder({ page }).analyze();
    const criticalViolations = results.violations.filter(
      (violation) => violation.impact === "critical",
    );

    expect(criticalViolations).toEqual([]);
  });
});
