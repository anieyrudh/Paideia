import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import {
  expectProductSimulationReveal,
  mountSim,
} from "../../../../../../testing/sim-harness/src/playwright-contract.js";

test.describe("a-level/mathematics/normal-distribution/normal-area-standardisation-lab prediction-checkpoint", () => {
  test("satisfies the product reveal visual contract", async ({ page }) => {
    await expectProductSimulationReveal(page, {
      simId: "a-level/mathematics/normal-distribution/normal-area-standardisation-lab",
      setup: [
        { role: "button", name: "Set up normal model" },
        { role: "button", name: "Reveal area" },
      ],
      prediction: {
        optionLabel: "The central interval",
        rationale: "The central interval covers the high-density middle of the distribution.",
      },
    });
  });

  test("prediction-checkpoint keeps normal-area readouts visible while saving reflection", async ({ page }) => {
    await mountSim(page, "a-level/mathematics/normal-distribution/normal-area-standardisation-lab");

    {

      const setupButton = page.getByRole("button", { name: "Set up normal model" });

      if ((await setupButton.count()) > 0) {

        await setupButton.first().click();

      }

    }
    await page.getByRole("button", { name: "Reveal area" }).click();

    await expect(page.getByRole("form", { name: "Prediction checkpoint" })).toBeVisible();

    await page.getByLabel("The central interval").check();
    await page
      .getByLabel("Rationale")
      .fill("The central interval covers the high-density middle, while the tail begins two standard deviations above the mean.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    await expect(page.getByText("Target probability", { exact: true })).toBeVisible();
    await expect(page.getByText("Area", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Area readout")).toContainText("68.3%");
  });

  test("upper-bound manipulation changes the revealed z-substitution", async ({ page }) => {
    await mountSim(page, "a-level/mathematics/normal-distribution/normal-area-standardisation-lab");

    {

      const setupButton = page.getByRole("button", { name: "Set up normal model" });

      if ((await setupButton.count()) > 0) {

        await setupButton.first().click();

      }

    }
    await page.getByLabel("Upper bound").fill("124");
    await page.getByRole("button", { name: "Reveal area" }).click();
    await page.getByLabel("The central interval").check();
    await page.getByLabel("Rationale").fill("The upper bound is two standard deviations above the mean.");
    await page.getByRole("button", { name: "Commit prediction" }).click();

    await expect(page.getByLabel("Area readout")).toContainText("81.9%");
    await expect(page.getByLabel("Formula used")).toContainText("z_upper = (124 - 100) / 12.00");
  });

  test("has no serious accessibility violations after reveal", async ({ page }) => {
    await mountSim(page, "a-level/mathematics/normal-distribution/normal-area-standardisation-lab");

    {

      const setupButton = page.getByRole("button", { name: "Set up normal model" });

      if ((await setupButton.count()) > 0) {

        await setupButton.first().click();

      }

    }
    await page.getByRole("button", { name: "Reveal area" }).click();
    await page.getByLabel("The central interval").check();
    await page.getByLabel("Rationale").fill("The prediction compares area, not the z-score itself.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    await page.getByLabel("Observation unlocked").waitFor();

    const results = await new AxeBuilder({ page }).analyze();
    const seriousOrCritical = results.violations.filter(
      (violation) => violation.impact === "critical" || violation.impact === "serious",
    );

    expect(seriousOrCritical).toEqual([]);
  });
});
