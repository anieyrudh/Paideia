import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("Recursion Tree Complexity", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/?sim=sutd/csd/recursion-tree-complexity/recursion-tree-complexity");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  const commitPrediction = async (page: import("@playwright/test").Page) => {
    await page.getByLabel("Every level contributes n operations, so the height adds a log n factor.").check();
    await page
      .getByLabel("Rationale")
      .fill("There are twice as many nodes and half as much linear work per node, so level cost stays n.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
  };

  test("prediction-gate blocks reveal until a prediction is committed", async ({ page }) => {
    await expect(page.getByRole("form", { name: "Prediction gate" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Observation unlocked" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Build tree" })).toHaveCount(0);

    await commitPrediction(page);
    await page.getByRole("button", { name: "Build tree" }).click();
    await page.getByRole("button", { name: "Reveal level costs" }).click();

    await expect(page.getByRole("region", { name: "Observation unlocked" })).toBeVisible();
  });

  test("manipulating the recurrence changes visible state and dominance", async ({ page }) => {
    await commitPrediction(page);
    await page.getByRole("button", { name: "Build tree" }).click();
    await page.getByLabel("Input size").selectOption({ label: "81 items" });
    await page.getByLabel("Recursive calls per node").selectOption({ label: "3 branches" });
    await page.getByLabel("Shrink factor").selectOption({ label: "n/2" });
    await page.getByLabel("Combine-work pattern").selectOption({ label: "linear combine work" });
    await page.getByRole("button", { name: "Reveal level costs" }).click();

    const observation = page.getByRole("region", { name: "Observation unlocked" });
    await expect(observation).toContainText("leaf-heavy");
    await expect(observation).toContainText("Theta(n^1.585)");
    await expect(observation).toContainText("81 operations");
  });

  test("shows formula, legend, substituted values, units, interpretation, and chart evidence", async ({ page }) => {
    await commitPrediction(page);
    await page.getByRole("button", { name: "Build tree" }).click();
    await page.getByRole("button", { name: "Reveal level costs" }).click();

    const formula = page.getByRole("region", { name: "Formula and interpretation" });
    await expect(formula).toContainText("L_k");
    await expect(formula).toContainText("total work at level k, measured in operations");
    await expect(formula).toContainText("L_2 = 2^2 * 1 * (128 / 2^2)^1 = 128 operations");
    await expect(formula).toContainText("Theta(n log n)");
    await expect(page.getByRole("img", { name: "Line chart of recursion tree level costs in operations" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Algorithm trace evidence" })).toContainText("merge-sort trace");
  });

  test("has no serious or critical accessibility violations after reveal", async ({ page }) => {
    await commitPrediction(page);
    await page.getByRole("button", { name: "Build tree" }).click();
    await page.getByRole("button", { name: "Reveal level costs" }).click();
    await page.getByRole("region", { name: "Observation unlocked" }).waitFor();

    const results = await new AxeBuilder({ page }).analyze();
    const violations = results.violations.filter(
      (violation) => violation.impact === "critical" || violation.impact === "serious",
    );

    expect(violations).toEqual([]);
  });
});
