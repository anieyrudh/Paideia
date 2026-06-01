import { expect, test } from "@playwright/test";
import { expectProductSimulationReveal } from "../../../../../../testing/sim-harness/src/playwright-contract.js";

const simId =
  "sutd/10-017-technological-world-e-and-m/magnetic-induction-faraday-lenz/magnetic-induction-faraday-lenz";
const route = `/?sim=${simId}`;
const predictionOption =
  "Into the page, because Lenz's law opposes the increase in outward flux.";

test.describe("Magnetic Induction: Faraday-Lenz", () => {
  test("satisfies the product reveal visual contract", async ({ page }) => {
    await expectProductSimulationReveal(page, {
      simId,
      setup: [],
      prediction: {
        optionLabel: predictionOption,
        rationale: "Lenz's law: the induced current opposes the increase in outward flux.",
      },
    });
  });

  test("prediction-checkpoint keeps reveal visible while saving reflection", async ({ page }) => {
    await page.goto(route);

    await expect(page.getByText("Faraday-Lenz evidence")).toBeVisible();
    await expect(page.getByRole("form", { name: "Prediction checkpoint" })).toBeVisible();

    await page.getByRole("radio", { name: predictionOption }).check();
    await page
      .getByLabel("Rationale")
      .fill("Increasing outward flux requires an induced field into the page.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    await expect(page.getByText("Faraday-Lenz evidence")).toBeVisible();
  });

  test("manipulation changes visible induced emf", async ({ page }) => {
    await page.goto(route);

    await page.getByRole("slider", { name: "Coil turns" }).fill("80");

    await expect(page.getByText("1280.00 mV", { exact: true })).toBeVisible();
    await expect(page.getByText("oppose increase", { exact: true })).toBeVisible();
  });
});
