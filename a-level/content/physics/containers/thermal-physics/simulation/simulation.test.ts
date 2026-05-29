import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { mountSim } from "../../../../../../testing/sim-harness/src/playwright-contract.js";

test.describe("a-level/physics/thermal-physics/gas-law-energy-transfer-lab prediction-checkpoint", () => {
  test("prediction-checkpoint keeps thermal readouts visible while saving reflection", async ({ page }) => {
    await mountSim(page, "a-level/physics/thermal-physics/gas-law-energy-transfer-lab");

    {

      const setupButton = page.getByRole("button", { name: "Set up thermal lab" });

      if ((await setupButton.count()) > 0) {

        await setupButton.first().click();

      }

    }
    await page.getByRole("button", { name: "Reveal thermal behaviour" }).click();

    await expect(page.getByRole("form", { name: "Prediction checkpoint" })).toBeVisible();

    await page.getByLabel("100 kPa").check();
    await page
      .getByLabel("Rationale")
      .fill("The gas-law temperature must be converted from Celsius to kelvin first.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    await expect(page.getByText("Gas pressure")).toBeVisible();
    await expect(page.getByText("99.8 kPa").first()).toBeVisible();
    await expect(page.getByLabel("Formula legend")).toContainText("kelvin temperature");
  });

  test("manipulation changes pressure and keeps formula evidence visible", async ({ page }) => {
    await mountSim(page, "a-level/physics/thermal-physics/gas-law-energy-transfer-lab");

    {

      const setupButton = page.getByRole("button", { name: "Set up thermal lab" });

      if ((await setupButton.count()) > 0) {

        await setupButton.first().click();

      }

    }
    await page.getByRole("slider", { name: "Gas volume" }).fill("0.5");
    await page.getByRole("button", { name: "Reveal thermal behaviour" }).click();
    await page.getByLabel("100 kPa").check();
    await page
      .getByLabel("Rationale")
      .fill("At fixed amount and thermodynamic temperature, a smaller volume gives higher pressure.");
    await page.getByRole("button", { name: "Commit prediction" }).click();

    await expect(page.getByLabel("Thermal readout")).toContainText("199.6 kPa");
    await expect(page.getByLabel("Formula used")).toContainText("T_K =");
    await expect(page.getByLabel("Formula used")).toContainText("Q =");
    await expect(page.getByLabel("Formula used")).toContainText("about 91% too low");
  });

  test("has no serious accessibility violations after reveal", async ({ page }) => {
    await mountSim(page, "a-level/physics/thermal-physics/gas-law-energy-transfer-lab");

    {

      const setupButton = page.getByRole("button", { name: "Set up thermal lab" });

      if ((await setupButton.count()) > 0) {

        await setupButton.first().click();

      }

    }
    await page.getByRole("button", { name: "Reveal thermal behaviour" }).click();
    await page.getByLabel("100 kPa").check();
    await page
      .getByLabel("Rationale")
      .fill("The ideal-gas equation uses thermodynamic temperature, so 27 deg C is about 300 K.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    await page.getByLabel("Observation unlocked").waitFor();

    const results = await new AxeBuilder({ page }).analyze();
    const seriousOrCritical = results.violations.filter(
      (violation) => violation.impact === "critical" || violation.impact === "serious",
    );

    expect(seriousOrCritical).toEqual([]);
  });
});
