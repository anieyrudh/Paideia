import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("Conditional Probability and Bayes", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/?sim=sutd/10-022-modelling-uncertainty/conditional-probability-and-bayes/conditional-probability-and-bayes");
  });

  test("prediction-gate blocks posterior until commit", async ({ page }) => {
    await expect(page.getByRole("region", { name: "Observation unlocked" })).toHaveCount(0);
    await page.getByRole("button", { name: "Set up Bayes scenario" }).click();
    await page.getByRole("button", { name: "Reveal posterior" }).click();
    await expect(page.getByRole("form", { name: "Prediction gate" })).toBeVisible();

    await page.getByRole("radio", { name: "51.4%" }).check();
    await page.getByLabel("Rationale").fill("Bayes combines prior and test quality.");
    await page.getByRole("button", { name: "Commit prediction" }).click();

    await expect(page.getByRole("region", { name: "Observation unlocked" })).toContainText("Conditional probability and Bayes evidence");
    await expect(page.getByLabel("Formula used")).toContainText("P(H \\mid +)");
    await expect(page.getByLabel("Formula legend")).toContainText("prior prevalence");
    await expect(page.getByRole("region", { name: "Observation unlocked" })).toContainText("Substitution");
  });

  test("manipulation changes posterior", async ({ page }) => {
    await page.getByRole("button", { name: "Set up Bayes scenario" }).click();
    await page.getByRole("slider", { name: "Prior prevalence P(H)" }).fill("30");
    await page.getByRole("button", { name: "Reveal posterior" }).click();
    await page.getByRole("radio", { name: "90.0%" }).check();
    await page.getByLabel("Rationale").fill("Higher prior increases posterior.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    await expect(page.getByRole("region", { name: "Observation unlocked" })).toContainText("Posterior after +");
    await expect(page.getByRole("region", { name: "Observation unlocked" })).toContainText("80.3%");
  });

  test("has no critical accessibility violations after reveal", async ({ page }) => {
    await page.getByRole("button", { name: "Set up Bayes scenario" }).click();
    await page.getByRole("button", { name: "Reveal posterior" }).click();
    await page.getByRole("radio", { name: "51.4%" }).check();
    await page.getByLabel("Rationale").fill("Posterior must include base rate.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    await page.getByRole("region", { name: "Observation unlocked" }).waitFor();

    const results = await new AxeBuilder({ page }).analyze();
    const seriousOrCritical = results.violations.filter(
      (violation) => violation.impact === "critical" || violation.impact === "serious",
    );
    expect(seriousOrCritical).toEqual([]);
  });
});
