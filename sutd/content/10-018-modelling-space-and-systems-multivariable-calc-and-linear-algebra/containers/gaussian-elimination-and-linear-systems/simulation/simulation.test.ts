import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("Gaussian Elimination and Linear Systems", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(
      "/?sim=sutd/10-018-modelling-space-and-systems-multivariable-calc-and-linear-algebra/gaussian-elimination-and-linear-systems/gaussian-elimination-and-linear-systems",
    );
  });

  test("prediction-gate blocks row-reduction evidence until commit", async ({ page }) => {
    await expect(page.getByRole("region", { name: "Observation unlocked" })).toHaveCount(0);
    await page.getByRole("button", { name: "Set up row-reduction check" }).click();
    await page.getByRole("button", { name: "Reveal row-reduction evidence" }).click();
    await expect(page.getByRole("form", { name: "Prediction gate" })).toBeVisible();
    await page.getByRole("radio", { name: "A unique solution at x = 2, y = 1" }).check();
    await page.getByLabel("Rationale").fill("Two independent pivots give one intersection.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    await expect(page.getByRole("region", { name: "Observation unlocked" })).toContainText("Row-reduction evidence");
    await expect(page.getByLabel("LaTeX formula source")).toContainText("R_2");
    await expect(page.getByLabel("Formula legend")).toContainText("pivot");
  });

  test("manipulation switches to parallel classification", async ({ page }) => {
    await page.getByRole("button", { name: "Set up row-reduction check" }).click();
    await page.getByRole("slider", { name: "Row 1 x coefficient" }).fill("1");
    await page.getByRole("slider", { name: "Row 1 y coefficient" }).fill("1");
    await page.getByRole("slider", { name: "Row 2 x coefficient" }).fill("2");
    await page.getByRole("slider", { name: "Row 2 y coefficient" }).fill("2");
    await page.getByRole("slider", { name: "Row 1 right side" }).fill("2");
    await page.getByRole("slider", { name: "Row 2 right side" }).fill("5");
    await page.getByRole("button", { name: "Reveal row-reduction evidence" }).click();
    await expect(page.getByRole("region", { name: "Observation unlocked" })).toHaveCount(0);
    await page.getByRole("radio", { name: "A unique solution at x = 2, y = 1" }).check();
    await page.getByLabel("Rationale").fill("This tests a zero determinant system.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    await expect(page.getByRole("region", { name: "Observation unlocked" })).toContainText("parallel");
  });

  test("has no serious accessibility violations after reveal", async ({ page }) => {
    await page.getByRole("button", { name: "Set up row-reduction check" }).click();
    await page.getByRole("button", { name: "Reveal row-reduction evidence" }).click();
    await expect(page.getByRole("region", { name: "Observation unlocked" })).toHaveCount(0);
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
