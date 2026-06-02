import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { expectProductSimulationReveal } from "../../../../../../testing/sim-harness/src/playwright-contract.js";

const simId = "sutd/epd/bode-stability-margin/bode-stability-margin";
const route = `/?sim=${simId}`;
const predictionOption =
  "The phase margin decreases because crossover moves to a higher-lag frequency";

test.describe("Bode Stability Margin", () => {
  test("satisfies the product reveal visual contract", async ({ page }) => {
    await expectProductSimulationReveal(page, {
      simId,
      setup: [],
      prediction: {
        optionLabel: predictionOption,
        rationale: "Doubling gain moves the 0 dB crossing to a higher-lag frequency.",
      },
    });
  });

  test("prediction-checkpoint keeps margin evidence visible while saving reflection", async ({ page }) => {
    await page.goto(route);

    const observation = page.getByRole("region", { name: "Observation unlocked" });
    await expect(observation).toBeVisible();
    await expect(observation).toContainText("Phase margin");
    await expect(page.getByLabel("Stability margin formula")).toContainText("PM");
    await expect(page.getByLabel("Formula legend")).toContainText("gain crossover");
    await expect(page.getByRole("form", { name: "Prediction checkpoint" })).toBeVisible();

    await page.getByRole("radio", { name: predictionOption }).check();
    await page
      .getByLabel("Rationale")
      .fill("Higher gain moves the 0 dB crossing to a higher frequency with more lag.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    await expect(observation).toBeVisible();
  });

  test("manipulation changes visible margin state", async ({ page }) => {
    await page.goto(route);

    await page.getByRole("slider", { name: "Loop gain" }).fill("4");

    const observation = page.getByRole("region", { name: "Observation unlocked" });
    await expect(observation).toContainText("Loop gain K = 4.0 times");
    await expect(observation).toContainText("phase margin is thin");
  });

  test("has no serious or critical accessibility violations after reveal", async ({ page }) => {
    await page.goto(route);

    await page.getByRole("radio", { name: predictionOption }).check();
    await page.getByLabel("Rationale").fill("A margin claim needs both magnitude and phase.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    await page.getByRole("region", { name: "Observation unlocked" }).waitFor();

    const results = await new AxeBuilder({ page }).analyze();
    const seriousOrCritical = results.violations.filter(
      (violation) => violation.impact === "critical" || violation.impact === "serious",
    );

    expect(seriousOrCritical).toEqual([]);
  });
});
