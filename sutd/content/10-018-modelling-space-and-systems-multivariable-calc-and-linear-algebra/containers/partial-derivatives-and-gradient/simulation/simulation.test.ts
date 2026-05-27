import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("Partial Derivatives and Gradient", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(
      "/?sim=sutd/10-018-modelling-space-and-systems-multivariable-calc-and-linear-algebra/partial-derivatives-and-gradient/partial-derivatives-and-gradient",
    );
  });

  test("prediction-gate blocks gradient evidence until commit", async ({ page }) => {
    await expect(page.getByRole("region", { name: "Observation unlocked" })).toHaveCount(0);

    await page.getByRole("button", { name: "Set point and direction" }).click();
    await page.getByRole("button", { name: "Reveal gradient evidence" }).click();

    await expect(page.getByRole("form", { name: "Prediction gate" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Observation unlocked" })).toHaveCount(0);
    await expect(page.getByRole("region", { name: "Formula panel" })).toHaveCount(0);

    await page.getByRole("radio", { name: "Perpendicular to the contour, toward fastest increase" }).check();
    await page
      .getByLabel("Rationale")
      .fill("The gradient is normal to level curves and points toward the fastest local increase.");
    await page.getByRole("button", { name: "Commit prediction" }).click();

    const observation = page.getByRole("region", { name: "Observation unlocked" });
    await expect(observation).toBeVisible();
    await expect(observation).toContainText("Gradient evidence");
    await expect(page.getByRole("region", { name: "Formula panel" })).toContainText("Substitution");
  });

  test("manipulating the point changes visible gradient evidence", async ({ page }) => {
    await page.getByRole("button", { name: "Set point and direction" }).click();
    await page.getByRole("slider", { name: "Point x" }).fill("2");
    await page.getByRole("button", { name: "Reveal gradient evidence" }).click();
    await page.getByRole("radio", { name: "Perpendicular to the contour, toward fastest increase" }).check();
    await page.getByLabel("Rationale").fill("The larger x position should change the x partial derivative.");
    await page.getByRole("button", { name: "Commit prediction" }).click();

    const observation = page.getByRole("region", { name: "Observation unlocked" });
    await expect(observation).toContainText("Partial derivative f_x");
    await expect(observation).toContainText("height/x-unit");
  });

  test("formula, legend, substituted values, units, and interpretation are visible", async ({ page }) => {
    await page.getByRole("button", { name: "Set point and direction" }).click();
    await page.getByRole("button", { name: "Reveal gradient evidence" }).click();
    await page.getByRole("radio", { name: "Perpendicular to the contour, toward fastest increase" }).check();
    await page.getByLabel("Rationale").fill("The gradient should cross contours toward increase.");
    await page.getByRole("button", { name: "Commit prediction" }).click();

    const panel = page.getByRole("region", { name: "Formula panel" });
    await expect(panel).toContainText("nabla f");
    await expect(panel).toContainText("Legend:");
    await expect(panel).toContainText("Substitution:");
    await expect(panel).toContainText("height units");
    await expect(panel).toContainText("Interpretation:");
  });

  test("has no serious or critical accessibility violations after reveal", async ({ page }) => {
    await page.getByRole("button", { name: "Set point and direction" }).click();
    await page.getByRole("button", { name: "Reveal gradient evidence" }).click();
    await page.getByRole("radio", { name: "Perpendicular to the contour, toward fastest increase" }).check();
    await page.getByLabel("Rationale").fill("Contours have zero first-order change along themselves.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    await page.getByRole("region", { name: "Observation unlocked" }).waitFor();

    const results = await new AxeBuilder({ page }).analyze();
    const highImpactViolations = results.violations.filter(
      (violation) => violation.impact === "critical" || violation.impact === "serious",
    );

    expect(highImpactViolations).toEqual([]);
  });
});
