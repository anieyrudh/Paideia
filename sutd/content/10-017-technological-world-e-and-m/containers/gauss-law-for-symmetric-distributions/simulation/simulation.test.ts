/**
 * Gauss Law for Symmetric Distributions · Playwright coverage
 *
 * Includes the required prediction-gate assertion: reveal stays hidden until
 * the learner commits a prediction.
 */

import { expect, test } from "@playwright/test";

test.describe("Gauss Law for Symmetric Distributions", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(
      "/?sim=sutd/10-017-technological-world-e-and-m/gauss-law-for-symmetric-distributions/gauss-law-flux-surface-lab",
    );
  });

  test("prediction-gate blocks flux reveal until commit", async ({ page }) => {
    await expect(page.getByRole("region", { name: "Observation unlocked" })).toHaveCount(0);
    await page.getByRole("button", { name: "Choose Gaussian surface" }).click();
    await page.getByRole("button", { name: "Reveal flux readout" }).click();

    await expect(page.getByRole("form", { name: "Prediction gate" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Observation unlocked" })).toHaveCount(0);
    await page
      .getByRole("radio", {
        name: "The total flux stays the same because it depends only on enclosed charge.",
      })
      .check();
    await page
      .getByLabel("Rationale")
      .fill("Total flux is set by enclosed charge, while area changes field strength.");
    await page.getByRole("button", { name: "Commit prediction" }).click();

    await expect(page.getByRole("region", { name: "Observation unlocked" })).toBeVisible();
    await expect(page.getByText("Gauss law flux evidence")).toBeVisible();
    await expect(page.getByRole("figure", { name: "Flux and symmetry model" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Formula used" })).toBeVisible();
  });

  test("symmetry selection changes the visible Gaussian surface model", async ({ page }) => {
    await page.getByRole("button", { name: "Choose Gaussian surface" }).click();
    await page.getByLabel("Symmetry").selectOption({ label: "Long charged line" });
    await page.getByRole("button", { name: "Reveal flux readout" }).click();
    await page
      .getByRole("radio", {
        name: "The total flux stays the same because it depends only on enclosed charge.",
      })
      .check();
    await page
      .getByLabel("Rationale")
      .fill("The same flux rule applies; the useful surface changes with symmetry.");
    await page.getByRole("button", { name: "Commit prediction" }).click();

    await expect(page.getByText("Curved side contributes; end caps contribute zero")).toBeVisible();
    await expect(page.getByText("A_G = 2 pi r L")).toBeVisible();
  });
});
