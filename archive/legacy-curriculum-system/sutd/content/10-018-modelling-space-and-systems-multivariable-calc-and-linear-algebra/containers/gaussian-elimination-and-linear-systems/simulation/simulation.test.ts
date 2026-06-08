import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { expectProductSimulationReveal } from "../../../../../../testing/sim-harness/src/playwright-contract.js";

test.describe("Gaussian Elimination and Linear Systems", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(
      "/?sim=sutd/10-018-modelling-space-and-systems-multivariable-calc-and-linear-algebra/gaussian-elimination-and-linear-systems/gaussian-elimination-and-linear-systems",
    );
  });

  test("satisfies the product reveal visual contract", async ({ page }) => {
    await expectProductSimulationReveal(page, {
      simId:
        "sutd/10-018-modelling-space-and-systems-multivariable-calc-and-linear-algebra/gaussian-elimination-and-linear-systems/gaussian-elimination-and-linear-systems",
      setup: [
        { role: "button", name: "Set up row-reduction check" },
        { role: "button", name: "Reveal row-reduction evidence" },
      ],
      prediction: {
        optionLabel: "A unique solution at x = 2, y = 1",
        rationale: "Two independent pivots give one intersection.",
      },
    });
  });

  test("prediction-checkpoint keeps row-reduction evidence visible while saving reflection", async ({ page }) => {
    {
      const setupButton = page.getByRole("button", { name: "Set up row-reduction check" });
      if ((await setupButton.count()) > 0) {
        await setupButton.first().click();
      }
    }
    await page.getByRole("button", { name: "Reveal row-reduction evidence" }).click();
    await expect(page.getByRole("form", { name: "Prediction checkpoint" })).toBeVisible();
    await page.getByRole("radio", { name: "A unique solution at x = 2, y = 1" }).check();
    await page.getByLabel("Rationale").fill("Two independent pivots give one intersection.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    await expect(page.getByRole("region", { name: "Observation unlocked" })).toContainText("Row-reduction evidence");
    await expect(page.getByLabel("LaTeX formula source")).toContainText("R_2");
    await expect(page.getByLabel("Formula legend")).toContainText("pivot");
  });

  test("manipulation switches to parallel classification", async ({ page }) => {
    {
      const setupButton = page.getByRole("button", { name: "Set up row-reduction check" });
      if ((await setupButton.count()) > 0) {
        await setupButton.first().click();
      }
    }
    await page.getByRole("slider", { name: "Row 1 x coefficient" }).fill("1");
    await page.getByRole("slider", { name: "Row 1 y coefficient" }).fill("1");
    await page.getByRole("slider", { name: "Row 2 x coefficient" }).fill("2");
    await page.getByRole("slider", { name: "Row 2 y coefficient" }).fill("2");
    await page.getByRole("slider", { name: "Row 1 right side" }).fill("2");
    await page.getByRole("slider", { name: "Row 2 right side" }).fill("5");
    await page.getByRole("button", { name: "Reveal row-reduction evidence" }).click();
    await page.getByRole("radio", { name: "A unique solution at x = 2, y = 1" }).check();
    await page.getByLabel("Rationale").fill("This tests a zero determinant system.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    await expect(page.getByRole("region", { name: "Observation unlocked" })).toContainText("parallel");
  });

  test("has no serious accessibility violations after reveal", async ({ page }) => {
    {
      const setupButton = page.getByRole("button", { name: "Set up row-reduction check" });
      if ((await setupButton.count()) > 0) {
        await setupButton.first().click();
      }
    }
    await page.getByRole("button", { name: "Reveal row-reduction evidence" }).click();
    await page.getByRole("radio", { name: "A unique solution at x = 2, y = 1" }).check();
    await page.getByLabel("Rationale").fill("Back substitution gives x=2 and y=1.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    await page.getByRole("region", { name: "Observation unlocked" }).waitFor();
    const results = await new AxeBuilder({ page }).analyze();
    const seriousOrCritical = results.violations.filter(
      (violation) => violation.impact === "critical" || violation.impact === "serious",
    );
    expect(seriousOrCritical).toEqual([]);
  });
});
