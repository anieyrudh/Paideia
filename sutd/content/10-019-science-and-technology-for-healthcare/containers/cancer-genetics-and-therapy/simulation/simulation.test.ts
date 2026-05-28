import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("Cancer Genetics and Therapy", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(
      "/?sim=sutd/10-019-science-and-technology-for-healthcare/cancer-genetics-and-therapy/cancer-genetics-and-therapy",
    );
  });

  test("prediction-gate blocks clonal-growth + dose-response evidence until commit", async ({ page }) => {
    await expect(page.getByRole("region", { name: "Observation unlocked" })).toHaveCount(0);

    await page.getByRole("button", { name: "Set up cancer lab" }).click();
    await page.getByRole("button", { name: "Reveal clonal and dose-response evidence" }).click();

    await expect(page.getByRole("form", { name: "Prediction gate" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Observation unlocked" })).toHaveCount(0);

    await page
      .getByRole("radio", {
        name: "About 304x baseline, so about 3045 cells from a starting size of 10.",
      })
      .check();
    await page
      .getByLabel("Rationale")
      .fill("Fitness compounds per generation; ((1.1)^3)^20 is about 304x baseline.");
    await page.getByRole("button", { name: "Commit prediction" }).click();

    const observation = page.getByRole("region", { name: "Observation unlocked" });
    await expect(observation).toBeVisible();
    await expect(observation).toContainText("clonal");
    await expect(observation).toContainText("dose");
    await expect(page.getByLabel("LaTeX formula source")).toContainText("1+s");
    await expect(page.getByLabel("Formula legend")).toContainText("IC50");
    await page.getByRole("button", { name: "Explain resistance shift" }).click();
    await expect(page.getByRole("heading", { name: "Resistance shifts the IC50" })).toBeVisible();
  });

  test("raising resistance factor pushes the required dose up", async ({ page }) => {
    await page.getByRole("button", { name: "Set up cancer lab" }).click();
    await page.getByRole("slider", { name: "Resistance factor" }).fill("4");
    await page.getByRole("button", { name: "Reveal clonal and dose-response evidence" }).click();
    await page
      .getByRole("radio", {
        name: "About 304x baseline, so about 3045 cells from a starting size of 10.",
      })
      .check();
    await page.getByLabel("Rationale").fill("Resistance multiplies effective IC50.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    const observation = page.getByRole("region", { name: "Observation unlocked" });
    await expect(observation).toContainText("effective IC50");
  });

  test("has no serious accessibility violations after reveal", async ({ page }) => {
    await page.getByRole("button", { name: "Set up cancer lab" }).click();
    await page.getByRole("button", { name: "Reveal clonal and dose-response evidence" }).click();
    await page
      .getByRole("radio", {
        name: "About 304x baseline, so about 3045 cells from a starting size of 10.",
      })
      .check();
    await page.getByLabel("Rationale").fill("Drivers compound fitness.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    await page.getByRole("region", { name: "Observation unlocked" }).waitFor();
    const results = await new AxeBuilder({ page }).analyze();
    const seriousOrCritical = results.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious",
    );
    expect(seriousOrCritical).toEqual([]);
  });
});
