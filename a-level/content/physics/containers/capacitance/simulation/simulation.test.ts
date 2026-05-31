import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { mountSim } from "../../../../../../testing/sim-harness/src/playwright-contract.js";

test.describe("a-level/physics/capacitance/capacitor-charge-energy-lab prediction-checkpoint", () => {
  test("prediction-checkpoint keeps capacitor readouts visible while saving reflection", async ({ page }) => {
    await mountSim(page, "a-level/physics/capacitance/capacitor-charge-energy-lab");

    {

      const setupButton = page.getByRole("button", { name: "Set capacitor values" });

      if ((await setupButton.count()) > 0) {

        await setupButton.first().click();

      }

    }
    await page.getByRole("button", { name: "Reveal capacitor result" }).click();

    await expect(page.getByRole("form", { name: "Prediction checkpoint" })).toBeVisible();

    await page.getByLabel("Both stored charge and stored energy double").check();
    await page
      .getByLabel("Rationale")
      .fill("At fixed voltage, Q = CV and U = one half C V squared both scale with C.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    await expect(page.getByText("Stored charge", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Capacitance readout")).toContainText("2820.0 microC");
    await expect(page.getByLabel("Formula used")).toContainText("U = 1/2");
  });

  test("main controls change visible stored charge before reveal", async ({ page }) => {
    await mountSim(page, "a-level/physics/capacitance/capacitor-charge-energy-lab");

    {

      const setupButton = page.getByRole("button", { name: "Set capacitor values" });

      if ((await setupButton.count()) > 0) {

        await setupButton.first().click();

      }

    }
    await page.getByRole("slider", { name: "Capacitance" }).fill("950");
    await page.getByRole("button", { name: "Reveal capacitor result" }).click();
    await page.getByLabel("Both stored charge and stored energy double").check();
    await page.getByLabel("Rationale").fill("Doubling capacitance at fixed voltage doubles Q.");
    await page.getByRole("button", { name: "Commit prediction" }).click();

    await expect(page.getByLabel("Capacitance readout")).toContainText("5700.0 microC");
  });

  test("has no serious accessibility violations after reveal", async ({ page }) => {
    await mountSim(page, "a-level/physics/capacitance/capacitor-charge-energy-lab");

    {

      const setupButton = page.getByRole("button", { name: "Set capacitor values" });

      if ((await setupButton.count()) > 0) {

        await setupButton.first().click();

      }

    }
    await page.getByRole("button", { name: "Reveal capacitor result" }).click();
    await page.getByLabel("Both stored charge and stored energy double").check();
    await page
      .getByLabel("Rationale")
      .fill("At fixed voltage, charge and energy both scale directly with capacitance.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    await page.getByLabel("Observation unlocked").waitFor();

    const results = await new AxeBuilder({ page }).analyze();
    const seriousOrCritical = results.violations.filter(
      (violation) => violation.impact === "critical" || violation.impact === "serious",
    );

    expect(seriousOrCritical).toEqual([]);
  });
});
