import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { mountSim } from "../../../../../../testing/sim-harness/src/playwright-contract.js";

test.describe("a-level/physics/circuits/series-parallel-circuit-lab prediction-checkpoint", () => {
  test("prediction-checkpoint keeps circuit readouts visible while saving reflection", async ({ page }) => {
    await mountSim(page, "a-level/physics/circuits/series-parallel-circuit-lab");

    {
      const setupButton = page.getByRole("button", { name: "Build circuit" });
      if ((await setupButton.count()) > 0) {
        await setupButton.first().click();
      }
    }
    await page.getByRole("button", { name: "Reveal circuit result" }).click();

    await expect(page.getByRole("form", { name: "Prediction checkpoint" })).toBeVisible();

    await page.getByLabel("The total current increases").check();
    await page
      .getByLabel("Rationale")
      .fill("A parallel path lowers equivalent resistance, so a fixed voltage draws more current.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    await expect(page.getByText("Total current", { exact: true })).toBeVisible();
    await expect(page.getByText("0.205 A").first()).toBeVisible();
    await expect(page.getByText("R_p =").first()).toBeVisible();
  });

  test("main controls change visible circuit state before reveal", async ({ page }) => {
    await mountSim(page, "a-level/physics/circuits/series-parallel-circuit-lab");

    {
      const setupButton = page.getByRole("button", { name: "Build circuit" });
      if ((await setupButton.count()) > 0) {
        await setupButton.first().click();
      }
    }
    await page.getByLabel("Series resistor").fill("10");
    await page.getByRole("button", { name: "Reveal circuit result" }).click();
    await page.getByLabel("The total current increases").check();
    await page.getByLabel("Rationale").fill("Lower total resistance gives higher current.");
    await page.getByRole("button", { name: "Commit prediction" }).click();

    await expect(page.getByLabel("Circuit readout")).toContainText("0.265 A");
  });

  test("has no serious accessibility violations after reveal", async ({ page }) => {
    await mountSim(page, "a-level/physics/circuits/series-parallel-circuit-lab");

    {
      const setupButton = page.getByRole("button", { name: "Build circuit" });
      if ((await setupButton.count()) > 0) {
        await setupButton.first().click();
      }
    }
    await page.getByRole("button", { name: "Reveal circuit result" }).click();
    await page.getByLabel("The total current increases").check();
    await page
      .getByLabel("Rationale")
      .fill("The parallel pair lowers equivalent resistance because conductances add.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    await page.getByLabel("Observation unlocked").waitFor();

    const results = await new AxeBuilder({ page }).analyze();
    const seriousOrCritical = results.violations.filter(
      (violation) => violation.impact === "critical" || violation.impact === "serious",
    );

    expect(seriousOrCritical).toEqual([]);
  });
});
