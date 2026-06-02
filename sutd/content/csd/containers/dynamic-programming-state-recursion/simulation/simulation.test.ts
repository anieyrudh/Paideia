import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { expectProductSimulationReveal } from "../../../../../../testing/sim-harness/src/playwright-contract.js";

const simId = "sutd/csd/dynamic-programming-state-recursion/dynamic-programming-state-recursion";
const route = `/?sim=${simId}`;
const predictionOption = "Reuse ways(4) without changing its value.";

test.describe("Dynamic Programming State Recursion", () => {
  test("satisfies the product reveal visual contract", async ({ page }) => {
    await expectProductSimulationReveal(page, {
      simId,
      setup: [],
      prediction: {
        optionLabel: predictionOption,
        rationale: "Memoisation reuses the state value; the recurrence answer does not change.",
      },
    });
  });

  test("prediction-checkpoint keeps observation visible while saving reflection", async ({ page }) => {
    await page.goto(route);

    await expect(page.getByRole("form", { name: "Prediction checkpoint" })).toBeVisible();
    const observation = page.getByRole("region", { name: "Observation unlocked" });
    await expect(observation).toBeVisible();

    await page.getByLabel(predictionOption).check();
    await page
      .getByLabel("Rationale")
      .fill("Memoisation reuses the state value, so the recurrence result is unchanged.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    await expect(observation).toBeVisible();
  });

  test("manipulating the target state changes the result and trace readout", async ({ page }) => {
    await page.goto(route);

    await page.getByRole("button", { name: "n = 7" }).click();
    await page.getByLabel("Trace style").selectOption({ label: "Plain recursion comparison" });

    const observation = page.getByRole("region", { name: "Observation unlocked" });
    await expect(observation).toContainText("There are 21 possible step sequences for 7 steps.");
    await expect(observation).toContainText("plain recursive calls");
    await expect(observation).toContainText("stored state evaluations");
  });

  test("shows formula, legend, substituted values, units, and interpretation", async ({ page }) => {
    await page.goto(route);

    const formula = page.getByRole("region", { name: "Formula and interpretation" });
    await expect(formula).toContainText("ways(i) = ways(i - 1) + ways(i - 2)");
    await expect(formula).toContainText("number of step sequences");
    await expect(formula).toContainText("ways(5) = ways(4) + ways(3) = 5 + 3 = 8");
    await expect(formula).toContainText("Units:");
    await expect(formula).toContainText("Result:");
    await expect(formula).toContainText("Storing each state keeps the recurrence result");
  });

  test("has no serious or critical accessibility violations after reveal", async ({ page }) => {
    await page.goto(route);

    await page.getByLabel(predictionOption).check();
    await page.getByLabel("Rationale").fill("Memoisation reuses stored state values.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    await page.getByRole("region", { name: "Observation unlocked" }).waitFor();

    const results = await new AxeBuilder({ page }).analyze();
    const violations = results.violations.filter(
      (violation) => violation.impact === "critical" || violation.impact === "serious",
    );

    expect(violations).toEqual([]);
  });
});
