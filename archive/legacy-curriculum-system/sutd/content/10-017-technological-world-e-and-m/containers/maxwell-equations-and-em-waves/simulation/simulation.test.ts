import { expect, test } from "@playwright/test";
import { expectProductSimulationReveal } from "../../../../../../testing/sim-harness/src/playwright-contract.js";

const simId =
  "sutd/10-017-technological-world-e-and-m/maxwell-equations-and-em-waves/maxwell-equations-and-em-waves";
const route = `/?sim=${simId}`;
const predictionOption =
  "It sustains a changing magnetic field, allowing a transverse electromagnetic wave to propagate.";

test.describe("Maxwell Equations and EM Waves", () => {
  test("satisfies the product reveal visual contract", async ({ page }) => {
    await expectProductSimulationReveal(page, {
      simId,
      setup: [],
      prediction: {
        optionLabel: predictionOption,
        rationale: "Maxwell's displacement-current term couples changing E and B fields into a transverse wave.",
      },
    });
  });

  test("prediction-checkpoint keeps wave evidence visible while saving reflection", async ({ page }) => {
    await page.goto(route);

    const observation = page.getByRole("region", { name: "Observation unlocked" });
    await expect(observation).toBeVisible();
    await expect(observation).toContainText("Wave speed");
    await expect(page.getByRole("form", { name: "Prediction checkpoint" })).toBeVisible();

    await page.getByRole("radio", { name: predictionOption }).check();
    await page.getByLabel("Rationale").fill("Changing electric fields sustain magnetic fields.");
    await page.getByRole("button", { name: "Commit prediction" }).click();

    await expect(observation).toBeVisible();
    await expect(observation).toContainText("visible");
  });

  test("manipulation changes visible wavelength state", async ({ page }) => {
    await page.goto(route);

    await page.getByLabel("Relative permittivity").fill("4");

    const observation = page.getByRole("region", { name: "Observation unlocked" });
    await expect(observation).toContainText("1.50e+8 m/s");
    await expect(observation).toContainText("2.50e-7 m");
  });
});
