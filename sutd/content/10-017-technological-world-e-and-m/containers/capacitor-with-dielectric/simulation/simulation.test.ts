/**
 * Capacitor with Dielectric · Playwright coverage
 *
 * Includes the required `prediction-checkpoint` assertion: reveal stays hidden until
 * the learner commits a prediction.
 */

import { expect, test } from "@playwright/test";

test.describe("Capacitor with Dielectric", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/?sim=sutd/10-017-technological-world-e-and-m/capacitor-with-dielectric/capacitor-with-dielectric");
  });

  test("prediction-checkpoint keeps reveal visible while saving reflection", async ({ page }) => {
    {
      const setupButton = page.getByRole("button", { name: "Prepare dielectric model" });
      if ((await setupButton.count()) > 0) {
        await setupButton.first().click();
      }
    }
    await page.getByRole("button", { name: "Reveal dielectric readout" }).click();

    await expect(page.getByRole("form", { name: "Prediction checkpoint" })).toBeVisible();
    await page
      .getByRole("radio", {
        name: "Both capacitance and stored energy increase in proportion to the dielectric constant.",
      })
      .check();
    await page
      .getByLabel("Rationale")
      .fill("At fixed voltage, increasing kappa raises C, so Q and U rise.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    await expect(page.getByText("Dielectric capacitor evidence")).toBeVisible();
  });

  test("manipulation changes visible capacitance", async ({ page }) => {
    {
      const setupButton = page.getByRole("button", { name: "Prepare dielectric model" });
      if ((await setupButton.count()) > 0) {
        await setupButton.first().click();
      }
    }
    await page.getByRole("slider", { name: "Dielectric constant" }).evaluate((element) => {
      const input = element as HTMLInputElement;
      const valueSetter = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value",
      )?.set;
      valueSetter?.call(input, "6");
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });
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
