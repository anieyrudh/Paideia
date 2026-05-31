/**
 * Magnetic Induction: Faraday-Lenz · Playwright coverage
 *
 * Includes the required `prediction-checkpoint` assertion: reveal stays hidden until
 * the learner commits a prediction.
 */

import { expect, test } from "@playwright/test";

test.describe("Magnetic Induction: Faraday-Lenz", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(
      "/?sim=sutd/10-017-technological-world-e-and-m/magnetic-induction-faraday-lenz/magnetic-induction-faraday-lenz",
    );
  });

  test("prediction-checkpoint keeps reveal visible while saving reflection", async ({ page }) => {
    {
      const setupButton = page.getByRole("button", { name: "Prepare induction model" });
      if ((await setupButton.count()) > 0) {
        await setupButton.first().click();
      }
    }
    await page.getByRole("button", { name: "Reveal induced emf" }).click();

    await expect(page.getByRole("form", { name: "Prediction checkpoint" })).toBeVisible();
    await page
      .getByRole("radio", {
        name: "Into the page, because Lenz's law opposes the increase in outward flux.",
      })
      .check();
    await page
      .getByLabel("Rationale")
      .fill("Increasing outward flux requires an induced field into the page.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    await expect(page.getByText("Faraday-Lenz evidence")).toBeVisible();
  });

  test("manipulation changes visible induced emf", async ({ page }) => {
    {
      const setupButton = page.getByRole("button", { name: "Prepare induction model" });
      if ((await setupButton.count()) > 0) {
        await setupButton.first().click();
      }
    }
    await page.getByRole("slider", { name: "Coil turns" }).fill("80");
    await page.getByRole("button", { name: "Reveal induced emf" }).click();
    await page
      .getByRole("radio", {
        name: "Into the page, because Lenz's law opposes the increase in outward flux.",
      })
      .check();
    await page
      .getByLabel("Rationale")
      .fill("Doubling turns should double induced emf magnitude.");
    await page.getByRole("button", { name: "Commit prediction" }).click();

    await expect(page.getByText("1280.00 mV", { exact: true })).toBeVisible();
    await expect(page.getByText("oppose increase", { exact: true })).toBeVisible();
  });
});
