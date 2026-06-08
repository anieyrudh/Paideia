import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { mountSim } from "../../../../../../testing/sim-harness/src/playwright-contract.js";

test.describe("a-level/physics/work-energy-power/energy-transfer-lab prediction-checkpoint", () => {
  test("prediction-checkpoint keeps work and power readouts visible while saving reflection", async ({ page }) => {
    await mountSim(page, "a-level/physics/work-energy-power/energy-transfer-lab");

    {

      const setupButton = page.getByRole("button", { name: "Set up energy transfer" });

      if ((await setupButton.count()) > 0) {

        await setupButton.first().click();

      }

    }
    await page.getByRole("button", { name: "Reveal energy transfer" }).click();

    await expect(page.getByRole("form", { name: "Prediction checkpoint" })).toBeVisible();

    await page.getByLabel("30 J and 15 W").check();
    await page
      .getByLabel("Rationale")
      .fill("The force and displacement point in the same direction, so cos theta is 1.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    await expect(page.getByText("Work done")).toBeVisible();
    await expect(page.getByText("+30.00 J").first()).toBeVisible();
    await expect(page.getByText("W = F s cos(theta)").first()).toBeVisible();
  });

  test("has no serious accessibility violations after reveal", async ({ page }) => {
    await mountSim(page, "a-level/physics/work-energy-power/energy-transfer-lab");

    {

      const setupButton = page.getByRole("button", { name: "Set up energy transfer" });

      if ((await setupButton.count()) > 0) {

        await setupButton.first().click();

      }

    }
    await page.getByRole("button", { name: "Reveal energy transfer" }).click();
    await page.getByLabel("30 J and 15 W").check();
    await page
      .getByLabel("Rationale")
      .fill("The force and displacement point in the same direction, so the power is work divided by time.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    await page.getByLabel("Observation unlocked").waitFor();

    const results = await new AxeBuilder({ page }).analyze();
    const seriousOrCritical = results.violations.filter(
      (violation) => violation.impact === "critical" || violation.impact === "serious",
    );

    expect(seriousOrCritical).toEqual([]);
  });
});
