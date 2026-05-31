/**
 * Gauss Law for Symmetric Distributions · Playwright coverage
 *
 * Includes the required prediction-checkpoint assertion: observation stays visible
 * while the learner saves a prediction.
 */

import { expect, test } from "@playwright/test";
import { expectProductSimulationExperience } from "../../../../../../testing/sim-harness/src/playwright-contract.js";

const simId =
  "sutd/10-017-technological-world-e-and-m/gauss-law-for-symmetric-distributions/gauss-law-flux-surface-lab";

test.describe("Gauss Law for Symmetric Distributions", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`/?sim=${simId}`);
  });

  test("satisfies the product reveal visual contract", async ({ page }) => {
    await expectProductSimulationExperience(page, {
      simId,
      setup: [],
      prediction: {
        optionLabel:
          "The total flux stays the same because it depends only on enclosed charge.",
        rationale:
          "Total flux is set by enclosed charge, while area changes field strength.",
      },
      observation: { observationLabel: "Observation" },
    });
  });

  test("prediction-checkpoint keeps flux reveal visible while saving reflection", async ({ page }) => {
    await expect(page.getByRole("form", { name: "Prediction checkpoint" })).toBeVisible();
    await expect(page.getByText("Gauss law flux evidence")).toBeVisible();
    await page
      .getByRole("radio", {
        name: "The total flux stays the same because it depends only on enclosed charge.",
      })
      .check();
    await page
      .getByLabel("Rationale")
      .fill("Total flux is set by enclosed charge, while area changes field strength.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    await expect(page.getByText("Gauss law flux evidence")).toBeVisible();
    await expect(page.getByRole("figure", { name: "Flux and symmetry model" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Formula used" })).toBeVisible();
  });

  test("symmetry selection changes the visible Gaussian surface model", async ({ page }) => {
    await page.getByLabel("Symmetry", { exact: true }).selectOption({ label: "Long charged line" });
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
