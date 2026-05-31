import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { mountSim } from "../../../../../../testing/sim-harness/src/playwright-contract.js";

test.describe("a-level/physics/oscillations/simple-harmonic-motion-lab prediction-checkpoint", () => {
  test("prediction-checkpoint keeps oscillation readouts visible while saving reflection", async ({ page }) => {
    await mountSim(page, "a-level/physics/oscillations/simple-harmonic-motion-lab");

    {

      const setupButton = page.getByRole("button", { name: "Set up oscillator" });

      if ((await setupButton.count()) > 0) {

        await setupButton.first().click();

      }

    }
    {
      const setupButton = page.getByRole("button", { name: "Open prediction checkpoint" });
      if ((await setupButton.count()) > 0) {
        await setupButton.first().click();
      }
    }

    await expect(page.getByRole("form", { name: "Prediction checkpoint" })).toBeVisible();

    await page.getByLabel("The period stays the same").check();
    await page
      .getByLabel("Rationale")
      .fill("Amplitude is absent from the ideal period expression for a spring oscillator.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    await expect(page.getByLabel("Oscillation readout")).toContainText("Period");
    await expect(page.getByLabel("Formula legend")).toContainText("amplitude");
    await expect(page.getByLabel("Formula used")).toContainText("Energy:");
  });

  test("manipulation changes the period and keeps formula evidence visible", async ({ page }) => {
    await mountSim(page, "a-level/physics/oscillations/simple-harmonic-motion-lab");

    {

      const setupButton = page.getByRole("button", { name: "Set up oscillator" });

      if ((await setupButton.count()) > 0) {

        await setupButton.first().click();

      }

    }
    await page.getByRole("slider", { name: "Spring stiffness" }).fill("64");
    {
      const setupButton = page.getByRole("button", { name: "Open prediction checkpoint" });
      if ((await setupButton.count()) > 0) {
        await setupButton.first().click();
      }
    }
    await page.getByLabel("The period stays the same").check();
    await page
      .getByLabel("Rationale")
      .fill("Stiffness changes the period; amplitude alone does not in the ideal model.");
    await page.getByRole("button", { name: "Commit prediction" }).click();

    await expect(page.getByLabel("Observation unlocked")).toContainText("1.11 s");
    await expect(page.getByLabel("Formula used")).toContainText("ω = sqrt");
    await expect(page.getByLabel("Formula used")).toContainText("Substitution:");
  });

  test("has no serious accessibility violations after reveal", async ({ page }) => {
    await mountSim(page, "a-level/physics/oscillations/simple-harmonic-motion-lab");

    {

      const setupButton = page.getByRole("button", { name: "Set up oscillator" });

      if ((await setupButton.count()) > 0) {

        await setupButton.first().click();

      }

    }
    {
      const setupButton = page.getByRole("button", { name: "Open prediction checkpoint" });
      if ((await setupButton.count()) > 0) {
        await setupButton.first().click();
      }
    }
    await page.getByLabel("The period stays the same").check();
    await page
      .getByLabel("Rationale")
      .fill("Doubling amplitude changes the energy but not the ideal period formula.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    await page.getByLabel("Observation unlocked").waitFor();

    const results = await new AxeBuilder({ page }).analyze();
    const seriousOrCritical = results.violations.filter(
      (violation) => violation.impact === "critical" || violation.impact === "serious",
    );

    expect(seriousOrCritical).toEqual([]);
  });
});
