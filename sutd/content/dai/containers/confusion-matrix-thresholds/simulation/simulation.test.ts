import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("Confusion Matrix Thresholds", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/?sim=sutd/dai/confusion-matrix-thresholds/confusion-matrix-thresholds");
  });

  test("prediction-checkpoint keeps the confusion matrix visible while saving reflection", async ({ page }) => {

    {

      const setupButton = page.getByRole("button", { name: "Set threshold policy" });

      if ((await setupButton.count()) > 0) {

        await setupButton.first().click();

      }

    }
    await page.getByRole("button", { name: "Reveal confusion matrix" }).click();

    await expect(page.getByRole("form", { name: "Prediction checkpoint" })).toBeVisible();

    await page.getByRole("radio", { name: "Recall falls, so missed-positive cost can rise" }).check();
    await page
      .getByLabel("Rationale")
      .fill("A stricter threshold misses more actual positives when false negatives matter.");
    await page.getByRole("button", { name: "Commit prediction" }).click();

    const observation = page.getByRole("region", { name: "Observation unlocked" });
    await expect(observation).toBeVisible();
    await expect(observation).toContainText("Confusion matrix counts");
    await expect(observation).toContainText("Cost substitution");
  });

  test("manipulating the threshold visibly changes recall and counts", async ({ page }) => {
    {
      const setupButton = page.getByRole("button", { name: "Set threshold policy" });
      if ((await setupButton.count()) > 0) {
        await setupButton.first().click();
      }
    }
    await page.getByRole("slider", { name: "Decision threshold" }).fill("80");
    await page.getByRole("button", { name: "Reveal confusion matrix" }).click();
    await page.getByRole("radio", { name: "Recall falls, so missed-positive cost can rise" }).check();
    await page
      .getByLabel("Rationale")
      .fill("A high threshold should miss more actual positives.");
    await page.getByRole("button", { name: "Commit prediction" }).click();

    const observation = page.getByRole("region", { name: "Observation unlocked" });
    await expect(observation).toContainText("Threshold 80% produces 156 cost units");
    await expect(page.getByRole("region", { name: "Confusion matrix counts" })).toContainText(
      "FN",
    );
    await expect(page.getByRole("region", { name: "Formula and substitution" })).toContainText(
      "6 cases x 25 cost units",
    );
  });

  test("shows formula legend and revealed-state accessibility is clean", async ({ page }) => {
    {
      const setupButton = page.getByRole("button", { name: "Set threshold policy" });
      if ((await setupButton.count()) > 0) {
        await setupButton.first().click();
      }
    }
    await page.getByRole("button", { name: "Reveal confusion matrix" }).click();
    await page.getByRole("radio", { name: "Recall falls, so missed-positive cost can rise" }).check();
    await page.getByLabel("Rationale").fill("Precision, recall, and cost all matter.");
    await page.getByRole("button", { name: "Commit prediction" }).click();

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
