import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("Line Integrals and Conservative Vector Fields", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(
      "/?sim=sutd/10-018-modelling-space-and-systems-multivariable-calc-and-linear-algebra/line-integrals-and-conservative-vector-fields/line-integrals-and-conservative-vector-fields",
    );
  });

  test("prediction-checkpoint keeps line-integral evidence visible while saving reflection", async ({ page }) => {
    {
      const setupButton = page.getByRole("button", { name: "Set up path-independence check" });
      if ((await setupButton.count()) > 0) {
        await setupButton.first().click();
      }
    }
    await page.getByRole("button", { name: "Reveal line-integral evidence" }).click();
    await expect(page.getByRole("form", { name: "Prediction checkpoint" })).toBeVisible();
    await page.getByRole("radio", { name: "The work stays the same because the field is conservative" }).check();
    await page.getByLabel("Rationale").fill("A gradient field has endpoint-only work.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    const observation = page.getByRole("region", { name: "Observation unlocked" });
    await expect(observation).toContainText("Line-integral evidence");
    await expect(page.getByLabel("LaTeX formula source")).toContainText("int_C");
    await expect(page.getByLabel("Formula legend")).toContainText("vector field sampled");
  });

  test("manipulation changes the route-dependence verdict", async ({ page }) => {
    {
      const setupButton = page.getByRole("button", { name: "Set up path-independence check" });
      if ((await setupButton.count()) > 0) {
        await setupButton.first().click();
      }
    }
    await page.getByLabel("Vector field").selectOption({ label: "Rotational circulation field" });
    await page.getByLabel("Path shape").selectOption({ label: "Two-leg elbow path" });
    await page.getByRole("button", { name: "Reveal line-integral evidence" }).click();
    await page.getByRole("radio", { name: "The work stays the same because the field is conservative" }).check();
    await page.getByLabel("Rationale").fill("This deliberately tests the endpoint shortcut.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    await expect(page.getByRole("region", { name: "Observation unlocked" })).toContainText("route-dependent");
  });

  test("has no serious accessibility violations after reveal", async ({ page }) => {
    {
      const setupButton = page.getByRole("button", { name: "Set up path-independence check" });
      if ((await setupButton.count()) > 0) {
        await setupButton.first().click();
      }
    }
    await page.getByRole("button", { name: "Reveal line-integral evidence" }).click();
    await page.getByRole("radio", { name: "The work stays the same because the field is conservative" }).check();
    await page.getByLabel("Rationale").fill("Potential change should match the conservative field integral.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    await page.getByRole("region", { name: "Observation unlocked" }).waitFor();

    const results = await new AxeBuilder({ page }).analyze();
    const seriousOrCritical = results.violations.filter(
      (violation) => violation.impact === "critical" || violation.impact === "serious",
    );

    expect(seriousOrCritical).toEqual([]);
  });
});
