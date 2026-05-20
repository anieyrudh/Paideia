import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("Forces and Equilibrium", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/?sim=a-level/physics/forces-and-equilibrium/force-balance");
  });

  test("prediction-gate blocks force balance reveal until commit", async ({ page }) => {
    await expect(page.getByLabel("Observation unlocked")).toHaveCount(0);

    await expect(page.getByRole("form", { name: "Prediction gate" })).toBeVisible();
    await expect(page.getByText("Formula used")).toHaveCount(0);

    await page.getByRole("radio", { name: "6 N right and 5 N up" }).check();
    await page.getByLabel("Rationale").fill("Each component must cancel its opposite force.");
    await page.getByRole("button", { name: "Commit prediction" }).click();

    const observation = page.getByLabel("Observation unlocked");
    await expect(observation).toBeVisible();
    await expect(page.getByText("Formula used")).toBeVisible();
  });

  test("balanced preset makes both resultant components zero", async ({ page }) => {
    await page.getByRole("radio", { name: "6 N right and 5 N up" }).check();
    await page.getByLabel("Rationale").fill("Right support balances left pull; up support balances weight.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    await page.getByRole("button", { name: "balanced" }).click();

    const observation = page.getByLabel("Observation unlocked");
    await expect(observation).toContainText("0.0 N");
    await expect(observation).toContainText("equilibrium");
  });

  test("has no serious accessibility violations after reveal", async ({ page }) => {
    await page.getByRole("radio", { name: "6 N right and 5 N up" }).check();
    await page.getByLabel("Rationale").fill("The net force must be zero in x and y.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    await page.getByLabel("Observation unlocked").waitFor();

    const results = await new AxeBuilder({ page }).analyze();
    const seriousOrCritical = results.violations.filter(
      (violation) => violation.impact === "critical" || violation.impact === "serious",
    );

    expect(seriousOrCritical).toEqual([]);
  });
});
