import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("Determinant and Trace", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(
      "/?sim=sutd/10-018-modelling-space-and-systems-multivariable-calc-and-linear-algebra/determinant-and-trace/determinant-and-trace",
    );
  });

  test("prediction-gate blocks determinant and trace evidence until commit", async ({ page }) => {
    await expect(page.getByRole("region", { name: "Observation unlocked" })).toHaveCount(0);

    await page.getByRole("button", { name: "Set up determinant and trace check" }).click();
    await page.getByRole("button", { name: "Reveal determinant and trace evidence" }).click();

    await expect(page.getByRole("form", { name: "Prediction gate" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Observation unlocked" })).toHaveCount(0);

    await page
      .getByRole("radio", {
        name: "det A = 6 and tr A = 5, so area is scaled by 6 and the eigenvalues sum to 5",
      })
      .check();
    await page.getByLabel("Rationale").fill("ad - bc = 6 and a + d = 5.");
    await page.getByRole("button", { name: "Commit prediction" }).click();

    const observation = page.getByRole("region", { name: "Observation unlocked" });
    await expect(observation).toBeVisible();
    await expect(observation).toContainText("Determinant and trace evidence");
    await expect(observation).toContainText("det A = 6");
    await expect(observation).toContainText("tr A = 5");
    await expect(page.getByLabel("LaTeX formula source")).toContainText("ad - bc");
    await expect(page.getByLabel("Formula legend")).toContainText("signed area");
  });

  test("manipulation flips the determinant sign", async ({ page }) => {
    await page.getByRole("button", { name: "Set up determinant and trace check" }).click();
    await page.getByRole("slider", { name: "Top-left entry a" }).fill("0");
    await page.getByRole("slider", { name: "Top-right entry b" }).fill("1");
    await page.getByRole("slider", { name: "Bottom-left entry c" }).fill("1");
    await page.getByRole("slider", { name: "Bottom-right entry d" }).fill("0");
    await page.getByRole("button", { name: "Reveal determinant and trace evidence" }).click();
    await page
      .getByRole("radio", {
        name: "det A = 6 and tr A = 5, so area is scaled by 6 and the eigenvalues sum to 5",
      })
      .check();
    await page.getByLabel("Rationale").fill("I want to see the swap matrix.");
    await page.getByRole("button", { name: "Commit prediction" }).click();

    const observation = page.getByRole("region", { name: "Observation unlocked" });
    await expect(observation).toContainText("det A = -1");
    await expect(observation).toContainText("tr A = 0");
    await expect(observation).toContainText("orientation is flipped");
  });

  test("has no serious accessibility violations after reveal", async ({ page }) => {
    await page.getByRole("button", { name: "Set up determinant and trace check" }).click();
    await page.getByRole("button", { name: "Reveal determinant and trace evidence" }).click();
    await page
      .getByRole("radio", {
        name: "det A = 6 and tr A = 5, so area is scaled by 6 and the eigenvalues sum to 5",
      })
      .check();
    await page.getByLabel("Rationale").fill("The diagonal product minus the cross product equals 6.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    await page.getByRole("region", { name: "Observation unlocked" }).waitFor();

    const results = await new AxeBuilder({ page }).analyze();
    const seriousOrCritical = results.violations.filter(
      (violation) => violation.impact === "critical" || violation.impact === "serious",
    );

    expect(seriousOrCritical).toEqual([]);
  });
});
