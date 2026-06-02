import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { expectProductSimulationReveal } from "../../../../../../testing/sim-harness/src/playwright-contract.js";

const simId = "sutd/epd/signal-filter-frequency-response/signal-filter-frequency-response";
const route = `/?sim=${simId}`;
const predictionOption =
  "The output is about 0.707 of the input and the phase has already shifted";

test.describe("Signal Filter Frequency Response", () => {
  test("satisfies the product reveal visual contract", async ({ page }) => {
    await expectProductSimulationReveal(page, {
      simId,
      setup: [],
      prediction: {
        optionLabel: predictionOption,
        rationale: "Cutoff is the -3 dB point with a 45-degree phase shift, not a hard wall.",
      },
    });
  });

  test("prediction-checkpoint keeps filter evidence visible while saving reflection", async ({ page }) => {
    await page.goto(route);

    const observation = page.getByRole("region", { name: "Observation unlocked" });
    await expect(observation).toBeVisible();
    await expect(observation).toContainText("Frequency response evidence");
    await expect(page.getByLabel("Filter formula")).toContainText("0.707");
    await expect(page.getByLabel("Formula legend")).toContainText("cutoff frequency");
    await expect(page.getByRole("form", { name: "Prediction checkpoint" })).toBeVisible();

    await page.getByRole("radio", { name: predictionOption }).check();
    await page.getByLabel("Rationale").fill("Cutoff is the -3 dB point, not a wall.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    await expect(observation).toBeVisible();
  });

  test("manipulation changes visible filter state", async ({ page }) => {
    await page.goto(route);

    await page.getByRole("slider", { name: "Capacitance" }).fill("0.05");
    await page.getByRole("slider", { name: "Probe frequency" }).fill("4000");

    const observation = page.getByRole("region", { name: "Observation unlocked" });
    await expect(observation).toContainText("4000 Hz");
    await expect(observation).toContainText("attenuated band");
    await expect(page.getByLabel("Filter substitution")).toContainText("C = 0.00000005");
  });

  test("has no serious or critical accessibility violations after reveal", async ({ page }) => {
    await page.goto(route);

    await page.getByRole("radio", { name: predictionOption }).check();
    await page.getByLabel("Rationale").fill("Magnitude and phase must both be read at cutoff.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    await page.getByRole("region", { name: "Observation unlocked" }).waitFor();

    const results = await new AxeBuilder({ page }).analyze();
    const seriousOrCritical = results.violations.filter(
      (violation) => violation.impact === "critical" || violation.impact === "serious",
    );

    expect(seriousOrCritical).toEqual([]);
  });
});
