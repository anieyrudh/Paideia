import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { expectProductSimulationReveal } from "../../../../../../testing/sim-harness/src/playwright-contract.js";

const simId = "sutd/csd/recursion-tree-complexity/recursion-tree-complexity";
const route = `/?sim=${simId}`;
const predictionOption = "Every level contributes n operations, so the height adds a log n factor.";

test.describe("Recursion Tree Complexity", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(route);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test("satisfies the product reveal visual contract", async ({ page }) => {
    await expectProductSimulationReveal(page, {
      simId,
      setup: [],
      prediction: {
        optionLabel: predictionOption,
        rationale: "Twice as many nodes and half the per-node work keep level cost at n.",
      },
    });
  });

  test("prediction-checkpoint keeps observation visible while saving reflection", async ({ page }) => {
    await expect(page.getByRole("form", { name: "Prediction checkpoint" })).toBeVisible();
    const observation = page.getByRole("region", { name: "Observation unlocked" });
    await expect(observation).toBeVisible();

    await page.getByLabel(predictionOption).check();
    await page
      .getByLabel("Rationale")
      .fill("There are twice as many nodes and half as much linear work per node, so level cost stays n.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    await expect(observation).toBeVisible();
  });

  test("shows formula, legend, substituted values, units, and interpretation", async ({ page }) => {
    const formula = page.getByRole("region", { name: "Formula and interpretation" });
    await expect(formula).toContainText("L_k");
    await expect(formula).toContainText("total work at level k");
    await expect(formula).toContainText("Substitution");
    await expect(formula).toContainText("Units:");
    await expect(formula).toContainText("Result:");
  });

  test("has no serious or critical accessibility violations after reveal", async ({ page }) => {
    await page.getByLabel(predictionOption).check();
    await page.getByLabel("Rationale").fill("Each level contributes the same n operations.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    await page.getByRole("region", { name: "Observation unlocked" }).waitFor();

    const results = await new AxeBuilder({ page }).analyze();
    const violations = results.violations.filter(
      (violation) => violation.impact === "critical" || violation.impact === "serious",
    );

    expect(violations).toEqual([]);
  });
});
