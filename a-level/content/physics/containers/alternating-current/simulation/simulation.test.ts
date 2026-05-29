import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { mountSim } from "../../../../../../testing/sim-harness/src/playwright-contract.js";

test.describe("a-level/physics/alternating-current/ac-rms-phase-lab prediction-checkpoint", () => {
  test("prediction-checkpoint keeps AC readouts visible while saving reflection", async ({ page }) => {
    await mountSim(page, "a-level/physics/alternating-current/ac-rms-phase-lab");

    {
      const setupButton = page.getByRole("button", { name: "Build AC circuit" });
      if ((await setupButton.count()) > 0) {
        await setupButton.first().click();
      }
    }
    await page.getByRole("button", { name: "Reveal AC result" }).click();

    await expect(page.getByRole("form", { name: "Prediction checkpoint" })).toBeVisible();

    await page.getByLabel("The rms voltage stays the same").check();
    await page
      .getByLabel("Rationale")
      .fill("For a fixed peak voltage, rms voltage depends on amplitude, not the number of cycles per second.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    await expect(page.getByLabel("AC readout")).toContainText("RMS current");
    await expect(page.getByLabel("Formula used")).toContainText("I_rms = V_rms / |Z|");
    await expect(page.getByLabel("Symbol legend")).toContainText("V_rms");
  });

  test("main controls change visible phase and formula evidence before reveal", async ({ page }) => {
    await mountSim(page, "a-level/physics/alternating-current/ac-rms-phase-lab");

    {
      const setupButton = page.getByRole("button", { name: "Build AC circuit" });
      if ((await setupButton.count()) > 0) {
        await setupButton.first().click();
      }
    }
    await page.getByLabel("Capacitance").fill("220");
    await page.getByRole("button", { name: "Reveal AC result" }).click();
    await page.getByLabel("The rms voltage stays the same").check();
    await page.getByLabel("Rationale").fill("Frequency affects load reactance, not the source rms conversion.");
    await page.getByRole("button", { name: "Commit prediction" }).click();

    await expect(page.getByLabel("AC readout")).toContainText("inductive");
    await expect(page.getByLabel("Formula used")).toContainText("phi_I = -atan2");
    await expect(page.getByLabel("Formula used")).toContainText("Power substitution");
  });

  test("has no serious accessibility violations after reveal", async ({ page }) => {
    await mountSim(page, "a-level/physics/alternating-current/ac-rms-phase-lab");

    {
      const setupButton = page.getByRole("button", { name: "Build AC circuit" });
      if ((await setupButton.count()) > 0) {
        await setupButton.first().click();
      }
    }
    await page.getByRole("button", { name: "Reveal AC result" }).click();
    await page.getByLabel("The rms voltage stays the same").check();
    await page
      .getByLabel("Rationale")
      .fill("The rms value for a sine wave comes from peak amplitude, while frequency changes reactance.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    await page.getByLabel("Observation unlocked").waitFor();

    const results = await new AxeBuilder({ page }).analyze();
    const seriousOrCritical = results.violations.filter(
      (violation) => violation.impact === "critical" || violation.impact === "serious",
    );

    expect(seriousOrCritical).toEqual([]);
  });
});
