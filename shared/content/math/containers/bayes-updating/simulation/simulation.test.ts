import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { expectProductSimulationReveal } from "../../../../../../testing/sim-harness/src/playwright-contract.js";

test.describe("Shared Bayes Updating", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/?sim=shared/math/bayes-updating/bayes-updating");
  });

  test("satisfies the product reveal visual contract", async ({ page }) => {
    await expectProductSimulationReveal(page, {
      simId: "shared/math/bayes-updating/bayes-updating",
      prediction: {
        optionLabel: "51.4%",
        rationale: "Bayes combines prior and test reliability.",
      },
    });
  });

  test("prediction-gate blocks posterior until commit", async ({ page }) => {
    await expect(page.getByLabel("Observation unlocked")).toHaveCount(0);
    await expect(page.getByText("Formula used")).toHaveCount(0);
    await expect(page.getByRole("form", { name: "Prediction gate" })).toBeVisible();

    await page.getByRole("radio", { name: "51.4%" }).check();
    await page.getByLabel("Rationale").fill("Bayes combines prior and test reliability.");
    await page.getByRole("button", { name: "Commit prediction" }).click();

    const observation = page.getByLabel("Observation unlocked");
    await expect(observation).toContainText("Positive evidence reweights the prior");
    await expect(observation).toContainText("Posterior after +");
    await expect(page.getByLabel("Formula used")).toContainText("P(H | +)");
    await expect(page.getByLabel("Formula legend")).toContainText("false-positive rate");
    await expect(page.getByLabel("Formula used")).toContainText("Substitution");
  });

  test("manipulation changes posterior", async ({ page }) => {
    await page.getByRole("radio", { name: "51.4%" }).check();
    await page.getByLabel("Rationale").fill("The default posterior should be about half.");
    await page.getByRole("button", { name: "Commit prediction" }).click();

    await page.getByRole("slider", { name: "Prior probability P(H)" }).fill("30");

    const observation = page.getByLabel("Observation unlocked");
    await expect(observation).toContainText("80.3%");
  });

  test("shows the route chart and formula standard after reveal", async ({ page }) => {
    await page.getByRole("radio", { name: "51.4%" }).check();
    await page.getByLabel("Rationale").fill("The positive routes must be normalized.");
    await page.getByRole("button", { name: "Commit prediction" }).click();

    await expect(page.getByLabel("Positive evidence route chart")).toBeVisible();
    await expect(page.getByLabel("Formula used")).toContainText("P(H | +)");
    await expect(page.getByLabel("Formula used")).not.toContainText("\\color");
    await expect(page.getByLabel("Formula legend")).toContainText("prior probability");
    await expect(page.getByLabel("Formula used")).toContainText("Result:");
    await expect(page.getByLabel("Formula used")).toContainText("because a positive result");
  });

  test("has no serious accessibility violations after reveal", async ({ page }) => {
    await page.getByRole("radio", { name: "51.4%" }).check();
    await page.getByLabel("Rationale").fill("Posterior includes base rate and false positives.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    await page.getByLabel("Observation unlocked").waitFor();

    const results = await new AxeBuilder({ page }).analyze();
    const seriousOrCritical = results.violations.filter(
      (violation) => violation.impact === "critical" || violation.impact === "serious",
    );

    expect(seriousOrCritical).toEqual([]);
  });
});
