import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("Linear Regression", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => window.localStorage.clear());
    await page.goto("/?sim=sutd/10-022-modelling-uncertainty/linear-regression/linear-regression");
  });

  test("prediction-gate blocks regression evidence until commit", async ({ page }) => {
    await expect(page.getByRole("region", { name: "Observation unlocked" })).toHaveCount(0);
    await page.getByRole("button", { name: "Set regression data" }).click();
    await expect(page.getByRole("img", { name: "Plot frame" })).toBeVisible();
    await expect(page.getByLabel("Observed points")).not.toContainText("Residual");
    await page.getByRole("button", { name: "Reveal least-squares fit" }).click();

    await expect(page.getByRole("form", { name: "Prediction gate" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Observation unlocked" })).toHaveCount(0);

    await page.getByRole("radio", { name: "The fitted slope usually increases" }).check();
    await page
      .getByLabel("Rationale")
      .fill("The shifted high-x point has leverage, so it should pull the fitted slope upward.");
    await page.getByRole("button", { name: "Commit prediction" }).click();

    await expect(page.getByRole("region", { name: "Observation unlocked" })).toBeVisible();
    await expect(page.getByLabel("Formula evidence")).toContainText("y_hat = m x + b");
    await expect(page.getByLabel("Formula legend")).toContainText("residual");
    await expect(page.getByText("R squared")).toBeVisible();
  });

  test("outlier manipulation changes the visible fit", async ({ page }) => {
    await page.getByRole("button", { name: "Set regression data" }).click();
    await page.getByRole("button", { name: "upward outlier" }).click();
    await page.getByRole("button", { name: "Reveal least-squares fit" }).click();
    await page.getByRole("radio", { name: "The fitted slope usually increases" }).check();
    await page.getByLabel("Rationale").fill("The outlier should raise the fitted slope.");
    await page.getByRole("button", { name: "Commit prediction" }).click();

    await expect(page.getByRole("region", { name: "Observation unlocked" })).toContainText(
      "Slope",
    );
    await expect(page.getByLabel("Observed points and residuals")).toContainText("Residual");
  });

  test("formula, legend, substitution, units, and interpretation are shown together", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Set regression data" }).click();
    await page.getByRole("button", { name: "Reveal least-squares fit" }).click();
    await page.getByRole("radio", { name: "The fitted slope usually increases" }).check();
    await page.getByLabel("Rationale").fill("I will inspect the fitted line and residuals.");
    await page.getByRole("button", { name: "Commit prediction" }).click();

    await expect(page.getByLabel("Formula used")).toContainText("m = sum");
    await expect(page.getByLabel("Formula legend")).toContainText("points");
    await expect(page.getByLabel("Formula evidence")).toContainText("Substitution");
    await expect(page.getByLabel("Formula evidence")).toContainText("deg C");
    await expect(page.getByLabel("Formula evidence")).toContainText("Interpretation");

    await page.setViewportSize({ width: 390, height: 780 });
    const overflowing = await page
      .getByLabel("Formula evidence")
      .evaluate((element) => element.scrollWidth > element.clientWidth + 1);
    expect(overflowing).toBe(false);
  });

  test("has no serious or critical accessibility violations after reveal", async ({ page }) => {
    await page.getByRole("button", { name: "Set regression data" }).click();
    await page.getByRole("button", { name: "Reveal least-squares fit" }).click();
    await page.getByRole("radio", { name: "The fitted slope usually increases" }).check();
    await page.getByLabel("Rationale").fill("The line should respond to leverage.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    await page.getByRole("region", { name: "Observation unlocked" }).waitFor();

    const results = await new AxeBuilder({ page }).analyze();
    const seriousOrCritical = results.violations.filter(
      (violation) => violation.impact === "critical" || violation.impact === "serious",
    );
    expect(seriousOrCritical).toEqual([]);
  });
});
