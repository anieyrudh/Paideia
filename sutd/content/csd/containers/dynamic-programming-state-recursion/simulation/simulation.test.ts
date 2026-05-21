import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("Dynamic Programming State Recursion", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/?sim=sutd/csd/dynamic-programming-state-recursion/dynamic-programming-state-recursion");
  });

  const commitPrediction = async (page: import("@playwright/test").Page) => {
    await page.getByLabel("Reuse ways(4) without changing its value.").check();
    await page
      .getByLabel("Rationale")
      .fill("Memoisation reuses the state value, so the recurrence result is unchanged.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
  };

  test("prediction-gate blocks reveal until a prediction is committed", async ({ page }) => {
    await expect(page.getByRole("form", { name: "Prediction gate" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Observation unlocked" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Define recurrence state" })).toHaveCount(0);

    await commitPrediction(page);
    await page.getByRole("button", { name: "Define recurrence state" }).click();
    await page.getByRole("button", { name: "Reveal recursion trace" }).click();

    await expect(page.getByRole("region", { name: "Observation unlocked" })).toBeVisible();
  });

  test("manipulating the target state changes the result and trace readout", async ({ page }) => {
    await commitPrediction(page);
    await page.getByRole("button", { name: "Define recurrence state" }).click();
    await page.getByRole("button", { name: "n = 7" }).click();
    await page.getByLabel("Trace style").selectOption({ label: "Plain recursion comparison" });
    await page.getByRole("button", { name: "Reveal recursion trace" }).click();

    const observation = page.getByRole("region", { name: "Observation unlocked" });
    await expect(observation).toContainText("There are 21 possible step sequences for 7 steps.");
    await expect(observation).toContainText("plain recursive calls");
    await expect(observation).toContainText("stored state evaluations");
  });

  test("shows formula, legend, substituted values, units, and interpretation", async ({ page }) => {
    await commitPrediction(page);
    await page.getByRole("button", { name: "Define recurrence state" }).click();
    await page.getByRole("button", { name: "Reveal recursion trace" }).click();

    const formula = page.getByRole("region", { name: "Formula and interpretation" });
    await expect(formula).toContainText("ways(i) = ways(i - 1) + ways(i - 2)");
    await expect(formula).toContainText("number of step sequences");
    await expect(formula).toContainText("ways(5) = ways(4) + ways(3) = 5 + 3 = 8");
    await expect(formula).toContainText("sequences");
    await expect(formula).toContainText("Storing each state keeps the recurrence result");
  });

  test("has no serious or critical accessibility violations after reveal", async ({ page }) => {
    await commitPrediction(page);
    await page.getByRole("button", { name: "Define recurrence state" }).click();
    await page.getByRole("button", { name: "Reveal recursion trace" }).click();
    await page.getByRole("region", { name: "Observation unlocked" }).waitFor();

    const results = await new AxeBuilder({ page }).analyze();
    const violations = results.violations.filter(
      (violation) => violation.impact === "critical" || violation.impact === "serious",
    );

    expect(violations).toEqual([]);
  });
});
