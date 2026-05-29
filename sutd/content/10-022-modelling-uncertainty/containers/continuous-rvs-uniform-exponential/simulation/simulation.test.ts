import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const route =
  "/?sim=sutd/10-022-modelling-uncertainty/continuous-rvs-uniform-exponential/continuous-density-lab";

test.describe("Continuous RVs", () => {
  test("prediction-gate blocks density evidence until commit", async ({ page }) => {
    await page.goto(route);

    await expect(page.getByRole("region", { name: "Observation unlocked" })).toHaveCount(0);
    await expect(page.getByText("Interval probability")).toHaveCount(0);
    await page.getByLabel("Uniform").check();
    await page.getByLabel("Rationale").fill("Uniform is bounded over a fixed interval.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    await page.getByRole("button", { name: "Build density" }).click();

    await expect(page.getByText("Commit a prediction to reveal interval probability and moments.")).toBeVisible();
    await page.getByRole("button", { name: "Reveal area" }).click();
    await expect(page.getByRole("region", { name: "Observation unlocked" })).toBeVisible();
  });

  test("manipulation changes the visible density family", async ({ page }) => {
    await page.goto(route);

    await page.getByLabel("Exponential").check();
    await page.getByLabel("Rationale").fill("Exponential is the waiting-time model.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    await page.getByRole("button", { name: "Build density" }).click();
    await page.getByLabel("Density family").selectOption({ label: "Exponential" });
    await page.getByRole("button", { name: "Reveal area" }).click();

    await expect(page.getByText("Exponential PDF")).toBeVisible();
    await expect(page.getByText("lambda e^(-lambda x)")).toBeVisible();
  });

  test("has no serious accessibility violations after reveal", async ({ page }) => {
    await page.goto(route);

    await page.getByLabel("Uniform").check();
    await page.getByLabel("Rationale").fill("Uniform spreads density evenly over a bounded interval.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    await page.getByRole("button", { name: "Build density" }).click();
    await page.getByRole("button", { name: "Reveal area" }).click();

    const results = await new AxeBuilder({ page }).analyze();
    expect(
      results.violations.filter(
        (violation) => violation.impact === "serious" || violation.impact === "critical",
      ),
    ).toEqual([]);
  });
});
