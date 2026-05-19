import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { mountSim } from "../../../../../../testing/sim-harness/src/playwright-contract.js";

test.describe("a-level/physics/work-energy-power/energy-transfer-lab prediction-gate", () => {
  test("prediction-gate blocks work and power readouts until prediction commit", async ({ page }) => {
    await mountSim(page, "a-level/physics/work-energy-power/energy-transfer-lab");

    await expect(page.getByLabel("Observation unlocked")).toHaveCount(0);
    await expect(page.getByText("W = F s cos(theta)")).toHaveCount(0);

    await page.getByRole("button", { name: "Set up energy transfer" }).click();
    await page.getByRole("button", { name: "Reveal energy transfer" }).click();

    await expect(page.getByRole("form", { name: "Prediction gate" })).toBeVisible();
    await expect(page.getByLabel("Observation unlocked")).toHaveCount(0);
    await expect(page.getByText("W = F s cos(theta)")).toHaveCount(0);

    await page.getByLabel("30 J and 15 W").check();
    await page
      .getByLabel("Rationale")
      .fill("The force and displacement point in the same direction, so cos theta is 1.");
    await page.getByRole("button", { name: "Commit prediction" }).click();

    await expect(page.getByLabel("Observation unlocked")).toBeVisible();
    await expect(page.getByText("Work done")).toBeVisible();
    await expect(page.getByText("+30.00 J").first()).toBeVisible();
    await expect(page.getByText("W = F s cos(theta)").first()).toBeVisible();
  });

  test("has no critical accessibility violations after reveal", async ({ page }) => {
    await mountSim(page, "a-level/physics/work-energy-power/energy-transfer-lab");

    await page.getByRole("button", { name: "Set up energy transfer" }).click();
    await page.getByRole("button", { name: "Reveal energy transfer" }).click();
    await page.getByLabel("30 J and 15 W").check();
    await page
      .getByLabel("Rationale")
      .fill("The force and displacement point in the same direction, so the power is work divided by time.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    await page.getByLabel("Observation unlocked").waitFor();

    const results = await new AxeBuilder({ page }).analyze();
    const criticalViolations = results.violations.filter(
      (violation) => violation.impact === "critical",
    );

    expect(criticalViolations).toEqual([]);
  });
});
