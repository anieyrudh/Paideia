/**
 * RLC Circuit and Resonance · Playwright coverage
 *
 * Includes the required `prediction-checkpoint` assertion: reveal stays hidden until
 * the learner commits a prediction.
 */

import { expect, test } from "@playwright/test";
import { expectProductSimulationReveal } from "../../../../../../testing/sim-harness/src/playwright-contract.js";

const simId =
  "sutd/10-017-technological-world-e-and-m/rlc-circuit-and-resonance/rlc-circuit-and-resonance";

test.describe("RLC Circuit and Resonance", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`/?sim=${simId}`);
  });

  test("satisfies the product reveal visual contract", async ({ page }) => {
    await expectProductSimulationReveal(page, {
      simId,
      setup: [
        { role: "button", name: "Prepare RLC model" },
        { role: "button", name: "Reveal resonance readout" },
      ],
      prediction: {
        optionLabel:
          "Net reactance is near zero, so impedance is mostly resistance and current is largest.",
        rationale:
          "At resonance, inductive and capacitive reactance cancel while resistance remains.",
      },
    });
  });

  test("prediction-checkpoint keeps resonance evidence visible while saving reflection", async ({ page }) => {
    {
      const setupButton = page.getByRole("button", { name: "Prepare RLC model" });
      if ((await setupButton.count()) > 0) {
        await setupButton.first().click();
      }
    }
    await page.getByRole("button", { name: "Reveal resonance readout" }).click();

    await expect(page.getByRole("form", { name: "Prediction checkpoint" })).toBeVisible();
    await page
      .getByRole("radio", {
        name: "Net reactance is near zero, so impedance is mostly resistance and current is largest.",
      })
      .check();
    await page.getByLabel("Rationale").fill("At resonance, XL and XC cancel but R remains.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    await expect(page.getByText("RLC resonance evidence")).toBeVisible();
    await expect(page.getByLabel("RLC resonance formula")).toContainText("f_0");
  });

  test("manipulation changes visible resonance state", async ({ page }) => {
    {
      const setupButton = page.getByRole("button", { name: "Prepare RLC model" });
      if ((await setupButton.count()) > 0) {
        await setupButton.first().click();
      }
    }
    await page.getByRole("slider", { name: "Resistance" }).fill("10");
    await page.getByRole("button", { name: "Reveal resonance readout" }).click();
    await page
      .getByRole("radio", {
        name: "Net reactance is near zero, so impedance is mostly resistance and current is largest.",
      })
      .check();
    await page.getByLabel("Rationale").fill("Lower resistance increases the near-resonant current.");
    await page.getByRole("button", { name: "Commit prediction" }).click();

    const observation = page.getByRole("region", { name: "Observation unlocked" });
    await expect(observation).toContainText("0.999 A");
    await expect(observation).toContainText("near resonance");
  });
});
