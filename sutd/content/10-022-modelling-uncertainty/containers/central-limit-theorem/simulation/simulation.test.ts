import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { mountSim } from "../../../../../../testing/sim-harness/src/playwright-contract.js";

const simId = "sutd/10-022-modelling-uncertainty/central-limit-theorem/clt-sampler";

test.describe("Central Limit Theorem", () => {
  test("prediction-gate blocks sample-mean reveal until commit", async ({ page }) => {
    await mountSim(page, simId);

    await expect(page.getByRole("form", { name: "Prediction gate" })).toBeVisible();
    await expect(page.getByLabel("Observation unlocked")).toHaveCount(0);
    await expect(page.getByText("Formula used")).toHaveCount(0);

    await page
      .getByLabel("The sample means will be more bell-shaped and less spread out.")
      .check();
    await page.getByLabel("Rationale").fill("Averages should vary less than individual draws.");
    await page.getByRole("button", { name: "Commit prediction" }).click();

    await expect(page.getByLabel("Observation unlocked")).toBeVisible();
    await expect(page.getByLabel("Formula used")).toContainText("sigma-bar");
  });

  test("sample-size manipulation changes the standard-error readout", async ({ page }) => {
    await mountSim(page, simId);
    await page
      .getByLabel("The sample means will be more bell-shaped and less spread out.")
      .check();
    await page.getByLabel("Rationale").fill("Standard error divides population spread by sqrt n.");
    await page.getByRole("button", { name: "Commit prediction" }).click();

    await expect(page.getByLabel("CLT readout")).toContainText("1.65");
    await page.getByRole("button", { name: "n = 64" }).click();
    await expect(page.getByLabel("CLT readout")).toContainText("0.41");
  });

  test("prediction-gate state has no serious accessibility violations", async ({ page }) => {
    await mountSim(page, simId);
    await page.getByRole("form", { name: "Prediction gate" }).waitFor();

    const results = await new AxeBuilder({ page }).analyze();
    const seriousOrCritical = results.violations.filter(
      (violation) => violation.impact === "critical" || violation.impact === "serious",
    );

    expect(seriousOrCritical).toEqual([]);
  });

  test("has no serious accessibility violations after reveal", async ({ page }) => {
    await mountSim(page, simId);
    await page
      .getByLabel("The sample means will be more bell-shaped and less spread out.")
      .check();
    await page.getByLabel("Rationale").fill("The CLT is about repeated means, not changing the population.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    await page.getByLabel("Observation unlocked").waitFor();

    const results = await new AxeBuilder({ page }).analyze();
    const seriousOrCritical = results.violations.filter(
      (violation) => violation.impact === "critical" || violation.impact === "serious",
    );

    expect(seriousOrCritical).toEqual([]);
  });
});
