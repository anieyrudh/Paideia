import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { mountSim } from "../../../../../../testing/sim-harness/src/playwright-contract.js";

test.describe("a-level/physics/magnetic-fields/magnetic-force-direction-lab prediction-checkpoint", () => {
  test("prediction-checkpoint keeps magnetic force readouts visible while saving reflection", async ({ page }) => {
    await mountSim(page, "a-level/physics/magnetic-fields/magnetic-force-direction-lab");

    {

      const setupButton = page.getByRole("button", { name: "Set magnetic field" });

      if ((await setupButton.count()) > 0) {

        await setupButton.first().click();

      }

    }
    await page.getByRole("button", { name: "Reveal magnetic force" }).click();

    await expect(page.getByRole("form", { name: "Prediction checkpoint" })).toBeVisible();

    await page.getByLabel("Up the page").check();
    await page
      .getByLabel("Rationale")
      .fill("Current to the right and magnetic field into the page gives upward force.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    await expect(page.getByText("Wire force", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Magnetic field readout")).toContainText("1.92 x 10^-2 N");
    await expect(page.getByLabel("Formula used")).toContainText("F = BIL sin theta");
  });

  test("main controls change visible magnetic-force state before reveal", async ({ page }) => {
    await mountSim(page, "a-level/physics/magnetic-fields/magnetic-force-direction-lab");

    {

      const setupButton = page.getByRole("button", { name: "Set magnetic field" });

      if ((await setupButton.count()) > 0) {

        await setupButton.first().click();

      }

    }
    await page.getByLabel("Active wire length").fill("10");
    await page.getByRole("button", { name: "Reveal magnetic force" }).click();
    await page.getByLabel("Up the page").check();
    await page.getByLabel("Rationale").fill("Longer active conductor length increases BIL force.");
    await page.getByRole("button", { name: "Commit prediction" }).click();

    await expect(page.getByLabel("Magnetic field readout")).toContainText("2.40 x 10^-2 N");
  });

  test("has no serious accessibility violations after reveal", async ({ page }) => {
    await mountSim(page, "a-level/physics/magnetic-fields/magnetic-force-direction-lab");

    {

      const setupButton = page.getByRole("button", { name: "Set magnetic field" });

      if ((await setupButton.count()) > 0) {

        await setupButton.first().click();

      }

    }
    await page.getByRole("button", { name: "Reveal magnetic force" }).click();
    await page.getByLabel("Up the page").check();
    await page
      .getByLabel("Rationale")
      .fill("Fleming's left-hand rule gives the upward force direction.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    await page.getByLabel("Observation unlocked").waitFor();

    const results = await new AxeBuilder({ page }).analyze();
    const seriousOrCritical = results.violations.filter(
      (violation) => violation.impact === "critical" || violation.impact === "serious",
    );

    expect(seriousOrCritical).toEqual([]);
  });
});
