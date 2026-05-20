import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("Eigenvector Transformations", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/?sim=sutd/freshmore/eigenvector-transformations/eigenvector-transformations");
  });

  test("prediction-gate blocks invariant-direction evidence until commit", async ({ page }) => {
    await expect(page.getByRole("region", { name: "Observation unlocked" })).toHaveCount(0);

    await page.getByRole("button", { name: "Set up eigenvector check" }).click();
    await page.getByRole("button", { name: "Reveal invariant-direction result" }).click();

    await expect(page.getByRole("form", { name: "Prediction gate" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Observation unlocked" })).toHaveCount(0);

    await page
      .getByRole("radio", {
        name: "Av = (3, 0), so the vector stays on its line and triples",
      })
      .check();
    await page.getByLabel("Rationale").fill("A(1, 0) stays on the x-axis and scales by 3.");
    await page.getByRole("button", { name: "Commit prediction" }).click();

    const observation = page.getByRole("region", { name: "Observation unlocked" });
    await expect(observation).toBeVisible();
    await expect(observation).toContainText("Invariant-direction evidence");
    await expect(observation).toContainText("Av = (3 cu, 0 cu)");
    await expect(observation).toContainText("lambda = 3 times");
    await expect(page.getByLabel("LaTeX formula source")).toContainText("A");
    await expect(page.getByLabel("Formula legend")).toContainText("scale factor");
  });

  test("manipulation changes the eigenvector verdict", async ({ page }) => {
    await page.getByRole("button", { name: "Set up eigenvector check" }).click();
    await page.getByRole("slider", { name: "Vector y component" }).fill("1");
    await page.getByRole("button", { name: "Reveal invariant-direction result" }).click();
    await page
      .getByRole("radio", {
        name: "Av = (3, 0), so the vector stays on its line and triples",
      })
      .check();
    await page.getByLabel("Rationale").fill("I want to compare the changed vector with Av.");
    await page.getByRole("button", { name: "Commit prediction" }).click();

    const observation = page.getByRole("region", { name: "Observation unlocked" });
    await expect(observation).toContainText("Av = (4 cu, 2 cu)");
    await expect(observation).toContainText("v is not an eigenvector");
  });

  test("has no critical accessibility violations after reveal", async ({ page }) => {
    await page.getByRole("button", { name: "Set up eigenvector check" }).click();
    await page.getByRole("button", { name: "Reveal invariant-direction result" }).click();
    await page
      .getByRole("radio", {
        name: "Av = (3, 0), so the vector stays on its line and triples",
      })
      .check();
    await page.getByLabel("Rationale").fill("The output is a scalar multiple of the input.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    await page.getByRole("region", { name: "Observation unlocked" }).waitFor();

    const results = await new AxeBuilder({ page }).analyze();
    const seriousOrCritical = results.violations.filter(
      (violation) => violation.impact === "critical" || violation.impact === "serious",
    );

    expect(seriousOrCritical).toEqual([]);
  });
});
