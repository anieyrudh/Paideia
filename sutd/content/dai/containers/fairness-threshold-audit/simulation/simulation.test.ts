import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("Fairness Threshold Audit", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/?sim=sutd/dai/fairness-threshold-audit/fairness-threshold-audit");
  });

  test("prediction-gate blocks the group audit until commit", async ({ page }) => {
    await expect(page.getByRole("region", { name: "Observation unlocked" })).toHaveCount(0);

    await page.getByRole("button", { name: "Set audit policy" }).click();
    await page.getByRole("button", { name: "Reveal fairness audit" }).click();

    await expect(page.getByRole("form", { name: "Prediction gate" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Observation unlocked" })).toHaveCount(0);

    await page
      .getByRole("radio", { name: "The group with lower recall can carry more missed-support harm" })
      .check();
    await page
      .getByLabel("Rationale")
      .fill("The same threshold can create different false-negative counts for each group.");
    await page.getByRole("button", { name: "Commit prediction" }).click();

    const observation = page.getByRole("region", { name: "Observation unlocked" });
    await expect(observation).toBeVisible();
    await expect(observation).toContainText("Recall gap 40.0 percentage points");
    await expect(observation).toContainText("harm gap 50 cost units");
  });

  test("manipulating Group B's threshold visibly changes the audit gap", async ({ page }) => {
    await page.getByRole("button", { name: "Set audit policy" }).click();
    await page.getByRole("button", { name: "Lower Group B threshold" }).click();
    await page.getByRole("button", { name: "Reveal fairness audit" }).click();
    await page
      .getByRole("radio", { name: "The group with lower recall can carry more missed-support harm" })
      .check();
    await page.getByLabel("Rationale").fill("Lowering Group B threshold should reduce missed support.");
    await page.getByRole("button", { name: "Commit prediction" }).click();

    const observation = page.getByRole("region", { name: "Observation unlocked" });
    await expect(observation).toContainText("Recall gap 0.0 percentage points");
    await expect(observation).toContainText("harm gap 0 cost units");
    await expect(page.getByRole("article", { name: "Group B audit result" })).toContainText(
      "Threshold: 60%",
    );
  });

  test("shows formula legend, stakeholder annotation, and critical accessibility is clean", async ({ page }) => {
    await page.getByRole("button", { name: "Set audit policy" }).click();
    await page.getByRole("button", { name: "Reveal fairness audit" }).click();
    await page
      .getByRole("radio", { name: "The group with lower recall can carry more missed-support harm" })
      .check();
    await page.getByLabel("Rationale").fill("A group-level audit needs recall and harm comparisons.");
    await page.getByRole("button", { name: "Commit prediction" }).click();

    await expect(page.getByRole("region", { name: "Formula and substitution" })).toContainText(
      "Recall_g} = TP_g / (TP_g + FN_g)",
    );
    await expect(page.getByRole("region", { name: "Formula and substitution" })).toContainText(
      "cost units",
    );
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
