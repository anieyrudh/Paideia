/**
 * Capacitor with Dielectric · Playwright coverage
 *
 * Includes the required `prediction-gate` assertion: reveal stays hidden until
 * the learner commits a prediction.
 */

import { expect, test } from "@playwright/test";

test.describe("Capacitor with Dielectric", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/?sim=sutd/10-017-technological-world-e-and-m/capacitor-with-dielectric/capacitor-with-dielectric");
  });

  test("prediction-gate blocks reveal until commit", async ({ page }) => {
    await expect(page.getByRole("region", { name: "Observation unlocked" })).toHaveCount(0);
    await page.getByRole("button", { name: "Prepare dielectric model" }).click();
    await page.getByRole("button", { name: "Reveal dielectric readout" }).click();

    await expect(page.getByRole("form", { name: "Prediction gate" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Observation unlocked" })).toHaveCount(0);
    await page
      .getByRole("radio", {
        name: "Both capacitance and stored energy increase in proportion to the dielectric constant.",
      })
      .check();
    await page
      .getByLabel("Rationale")
      .fill("At fixed voltage, increasing kappa raises C, so Q and U rise.");
    await page.getByRole("button", { name: "Commit prediction" }).click();

    await expect(page.getByRole("region", { name: "Observation unlocked" })).toBeVisible();
    await expect(page.getByText("Dielectric capacitor evidence")).toBeVisible();
  });

  test("manipulation changes visible capacitance", async ({ page }) => {
    await page.getByRole("button", { name: "Prepare dielectric model" }).click();
    await page.getByRole("slider", { name: "Dielectric constant" }).fill("6");
    await page.getByRole("button", { name: "Reveal dielectric readout" }).click();
    await page
      .getByRole("radio", {
        name: "Both capacitance and stored energy increase in proportion to the dielectric constant.",
      })
      .check();
    await page.getByLabel("Rationale").fill("A stronger dielectric stores more charge.");
    await page.getByRole("button", { name: "Commit prediction" }).click();

    await expect(page.getByText("6.00 times the same air-filled geometry")).toBeVisible();
  });
});
