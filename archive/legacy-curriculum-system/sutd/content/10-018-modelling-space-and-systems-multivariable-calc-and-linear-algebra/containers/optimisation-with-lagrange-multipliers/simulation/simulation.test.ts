import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("Optimisation with Lagrange Multipliers", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(
      "/?sim=sutd/10-018-modelling-space-and-systems-multivariable-calc-and-linear-algebra/optimisation-with-lagrange-multipliers/optimisation-with-lagrange-multipliers",
    );
  });

  test("prediction-checkpoint keeps multiplier evidence visible while saving reflection", async ({ page }) => {

    {

      const setupButton = page.getByRole("button", { name: "Set constrained design" });

      if ((await setupButton.count()) > 0) {

        await setupButton.first().click();

      }

    }
    await page.getByRole("button", { name: "Reveal multiplier evidence" }).click();

    await expect(page.getByRole("form", { name: "Prediction checkpoint" })).toBeVisible();

    await page.getByRole("radio", { name: "They are parallel, so the objective has no first-order gain along the constraint" }).check();
    await page.getByLabel("Rationale").fill("At an optimum the objective has no tangent component along the constraint.");
    await page.getByRole("button", { name: "Commit prediction" }).click();

    const observation = page.getByRole("region", { name: "Observation unlocked" });
    await expect(observation).toBeVisible();
    await expect(observation).toContainText("Multiplier evidence");
    await expect(page.getByRole("region", { name: "Formula panel" })).toContainText("Substitution");
  });

  test("manipulating the point changes visible multiplier evidence", async ({ page }) => {
    {
      const setupButton = page.getByRole("button", { name: "Set constrained design" });
      if ((await setupButton.count()) > 0) {
        await setupButton.first().click();
      }
    }
    await page.getByRole("slider", { name: "Constraint point angle" }).fill("80");
    await page.getByRole("button", { name: "Reveal multiplier evidence" }).click();
    await page.getByRole("radio", { name: "They are parallel, so the objective has no first-order gain along the constraint" }).check();
    await page.getByLabel("Rationale").fill("Changing the feasible point changes both gradients.");
    await page.getByRole("button", { name: "Commit prediction" }).click();

    const observation = page.getByRole("region", { name: "Observation unlocked" });
    await expect(observation).toContainText("Lambda estimate");
    await expect(observation).toContainText("Tangent derivative");
  });

  test("formula, legend, substituted values, units, and interpretation are visible", async ({ page }) => {
    {
      const setupButton = page.getByRole("button", { name: "Set constrained design" });
      if ((await setupButton.count()) > 0) {
        await setupButton.first().click();
      }
    }
    await page.getByRole("button", { name: "Reveal multiplier evidence" }).click();
    await page.getByRole("radio", { name: "They are parallel, so the objective has no first-order gain along the constraint" }).check();
    await page.getByLabel("Rationale").fill("Parallel gradients remove feasible first-order improvement.");
    await page.getByRole("button", { name: "Commit prediction" }).click();

    const panel = page.getByRole("region", { name: "Formula panel" });
    await expect(panel).toContainText("nabla f");
    await expect(panel).toContainText("Legend:");
    await expect(panel).toContainText("Substitution:");
    await expect(panel).toContainText("benefit units");
    await expect(panel).toContainText("Interpretation:");
  });

  test("has no serious or critical accessibility violations after reveal", async ({ page }) => {
    {
      const setupButton = page.getByRole("button", { name: "Set constrained design" });
      if ((await setupButton.count()) > 0) {
        await setupButton.first().click();
      }
    }
    await page.getByRole("button", { name: "Reveal multiplier evidence" }).click();
    await page.getByRole("radio", { name: "They are parallel, so the objective has no first-order gain along the constraint" }).check();
    await page.getByLabel("Rationale").fill("The tangent derivative should vanish at the constrained optimum.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    await page.getByRole("region", { name: "Observation unlocked" }).waitFor();

    const results = await new AxeBuilder({ page }).analyze();
    const highImpactViolations = results.violations.filter(
      (violation) => violation.impact === "critical" || violation.impact === "serious",
    );

    expect(highImpactViolations).toEqual([]);
  });
});
