import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("Signal Filter Frequency Response", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(
      "/?sim=sutd/epd/signal-filter-frequency-response/signal-filter-frequency-response",
    );
  });

  test("prediction-gate blocks filter evidence until commit", async ({ page }) => {
    await expect(page.getByRole("region", { name: "Observation unlocked" })).toHaveCount(0);

    await page.getByRole("button", { name: "Prepare filter lab" }).click();
    await page.getByRole("button", { name: "Reveal frequency response" }).click();

    await expect(page.getByRole("form", { name: "Prediction gate" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Observation unlocked" })).toHaveCount(0);

    await page
      .getByRole("radio", {
        name: "The output is about 0.707 of the input and the phase has already shifted",
      })
      .check();
    await page.getByLabel("Rationale").fill("Cutoff is the -3 dB point, not a wall.");
    await page.getByRole("button", { name: "Commit prediction" }).click();

    const observation = page.getByRole("region", { name: "Observation unlocked" });
    await expect(observation).toBeVisible();
    await expect(observation).toContainText("Frequency response evidence");
    await expect(page.getByLabel("Filter formula")).toContainText("0.707");
    await expect(page.getByLabel("Formula legend")).toContainText("cutoff frequency");
  });

  test("manipulation changes visible filter state", async ({ page }) => {
    await page.getByRole("button", { name: "Prepare filter lab" }).click();
    await page.getByRole("slider", { name: "Capacitance" }).fill("0.05");
    await page.getByRole("slider", { name: "Probe frequency" }).fill("4000");
    await page.getByRole("button", { name: "Reveal frequency response" }).click();
    await page
      .getByRole("radio", {
        name: "The output is about 0.707 of the input and the phase has already shifted",
      })
      .check();
    await page.getByLabel("Rationale").fill("I want to compare a larger capacitor.");
    await page.getByRole("button", { name: "Commit prediction" }).click();

    const observation = page.getByRole("region", { name: "Observation unlocked" });
    await expect(observation).toContainText("4000 Hz");
    await expect(observation).toContainText("attenuated band");
    await expect(page.getByLabel("Filter substitution")).toContainText("C = 0.00000005");
  });

  test("has no serious or critical accessibility violations after reveal", async ({ page }) => {
    await page.getByRole("button", { name: "Prepare filter lab" }).click();
    await page.getByRole("button", { name: "Reveal frequency response" }).click();
    await page
      .getByRole("radio", {
        name: "The output is about 0.707 of the input and the phase has already shifted",
      })
      .check();
    await page
      .getByLabel("Rationale")
      .fill("Magnitude and phase must both be read at cutoff.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    await page.getByRole("region", { name: "Observation unlocked" }).waitFor();

    const results = await new AxeBuilder({ page }).analyze();
    const seriousOrCritical = results.violations.filter(
      (violation) => violation.impact === "critical" || violation.impact === "serious",
    );

    expect(seriousOrCritical).toEqual([]);
  });
});
