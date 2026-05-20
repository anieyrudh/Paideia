import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("Bode Stability Margin", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/?sim=sutd/epd/bode-stability-margin/bode-stability-margin");
  });

  test("prediction-gate blocks margin evidence until commit", async ({ page }) => {
    await expect(page.getByRole("region", { name: "Observation unlocked" })).toHaveCount(0);

    await page.getByRole("button", { name: "Prepare Bode readout" }).click();
    await page.getByRole("button", { name: "Reveal margin readout" }).click();

    await expect(page.getByRole("form", { name: "Prediction gate" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Observation unlocked" })).toHaveCount(0);

    await page
      .getByRole("radio", {
        name: "The phase margin decreases because crossover moves to a higher-lag frequency",
      })
      .check();
    await page
      .getByLabel("Rationale")
      .fill("Higher gain moves the 0 dB crossing to a higher frequency with more lag.");
    await page.getByRole("button", { name: "Commit prediction" }).click();

    const observation = page.getByRole("region", { name: "Observation unlocked" });
    await expect(observation).toBeVisible();
    await expect(observation).toContainText("Phase margin");
    await expect(page.getByLabel("Stability margin formula")).toContainText("PM");
    await expect(page.getByLabel("Formula legend")).toContainText("gain crossover");
  });

  test("manipulation changes visible margin state", async ({ page }) => {
    await page.getByRole("button", { name: "Prepare Bode readout" }).click();
    await page.getByRole("slider", { name: "Loop gain" }).fill("4");
    await page.getByRole("button", { name: "Reveal margin readout" }).click();
    await page
      .getByRole("radio", {
        name: "The phase margin decreases because crossover moves to a higher-lag frequency",
      })
      .check();
    await page.getByLabel("Rationale").fill("I want to compare the doubled-gain case.");
    await page.getByRole("button", { name: "Commit prediction" }).click();

    const observation = page.getByRole("region", { name: "Observation unlocked" });
    await expect(observation).toContainText("Loop gain K = 4.0 times");
    await expect(observation).toContainText("phase margin is thin");
  });

  test("has no serious or critical accessibility violations after reveal", async ({ page }) => {
    await page.getByRole("button", { name: "Prepare Bode readout" }).click();
    await page.getByRole("button", { name: "Reveal margin readout" }).click();
    await page
      .getByRole("radio", {
        name: "The phase margin decreases because crossover moves to a higher-lag frequency",
      })
      .check();
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
