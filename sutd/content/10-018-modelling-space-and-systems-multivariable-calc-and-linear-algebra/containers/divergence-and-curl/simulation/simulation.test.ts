import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("Divergence and Curl", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(
      "/?sim=sutd/10-018-modelling-space-and-systems-multivariable-calc-and-linear-algebra/divergence-and-curl/divergence-and-curl",
    );
  });

  test("prediction-gate blocks diagnostic evidence until commit", async ({ page }) => {
    await expect(page.getByRole("region", { name: "Observation unlocked" })).toHaveCount(0);
    await page.getByRole("button", { name: "Set up local diagnostic check" }).click();
    await page.getByRole("button", { name: "Reveal divergence and curl evidence" }).click();
    await expect(page.getByRole("form", { name: "Prediction gate" })).toBeVisible();
    await page.getByRole("radio", { name: "Curl is nonzero while divergence is zero" }).check();
    await page.getByLabel("Rationale").fill("The field spins around the origin without expanding there.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    await expect(page.getByRole("region", { name: "Observation unlocked" })).toContainText("Divergence and curl evidence");
    await expect(page.getByLabel("LaTeX formula source")).toContainText("nabla");
    await expect(page.getByLabel("Formula legend")).toContainText("x-component");
  });

  test("manipulation switches from curl to divergence", async ({ page }) => {
    await page.getByRole("button", { name: "Set up local diagnostic check" }).click();
    await page.getByLabel("Vector field").selectOption({ label: "Source field" });
    await page.getByRole("button", { name: "Reveal divergence and curl evidence" }).click();
    await page.getByRole("radio", { name: "Curl is nonzero while divergence is zero" }).check();
    await page.getByLabel("Rationale").fill("Switching field tests the diagnostic contrast.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    await expect(page.getByRole("region", { name: "Observation unlocked" })).toContainText("local source");
  });

  test("has no serious accessibility violations after reveal", async ({ page }) => {
    await page.getByRole("button", { name: "Set up local diagnostic check" }).click();
    await page.getByRole("button", { name: "Reveal divergence and curl evidence" }).click();
    await page.getByRole("radio", { name: "Curl is nonzero while divergence is zero" }).check();
    await page.getByLabel("Rationale").fill("Vortex has local spin but no source strength.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    await page.getByRole("region", { name: "Observation unlocked" }).waitFor();
    const results = await new AxeBuilder({ page }).analyze();
    const seriousOrCritical = results.violations.filter(
      (violation) => violation.impact === "critical" || violation.impact === "serious",
    );
    expect(seriousOrCritical).toEqual([]);
  });
});
