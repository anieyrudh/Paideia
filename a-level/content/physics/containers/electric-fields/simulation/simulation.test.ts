import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { mountSim } from "../../../../../../testing/sim-harness/src/playwright-contract.js";

test.describe("a-level/physics/electric-fields/charge-field-vector-lab prediction-checkpoint", () => {
  test("prediction-checkpoint keeps electric field readouts visible while saving reflection", async ({ page }) => {
    await mountSim(page, "a-level/physics/electric-fields/charge-field-vector-lab");

    {

      const setupButton = page.getByRole("button", { name: "Set charge position" });

      if ((await setupButton.count()) > 0) {

        await setupButton.first().click();

      }

    }
    await page.getByRole("button", { name: "Reveal field result" }).click();

    await expect(page.getByRole("form", { name: "Prediction checkpoint" })).toBeVisible();

    await page.getByLabel("To the left").check();
    await page
      .getByLabel("Rationale")
      .fill("A negative test charge feels force opposite to the electric field direction.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    await expect(page.getByText("Electric field strength", { exact: true })).toBeVisible();
    await expect(page.getByLabel("Electric field readout")).toContainText("2.00 x 10^5 N/C");
    await expect(page.getByLabel("Formula used")).toContainText("Delta U = q Delta V");
  });

  test("main controls change visible field state before reveal", async ({ page }) => {
    await mountSim(page, "a-level/physics/electric-fields/charge-field-vector-lab");

    {

      const setupButton = page.getByRole("button", { name: "Set charge position" });

      if ((await setupButton.count()) > 0) {

        await setupButton.first().click();

      }

    }
    await page.getByLabel("Separation").fill("10");
    await page.getByRole("button", { name: "Reveal field result" }).click();
    await page.getByLabel("To the left").check();
    await page.getByLabel("Rationale").fill("Closer points have stronger inverse-square fields.");
    await page.getByRole("button", { name: "Commit prediction" }).click();

    await expect(page.getByLabel("Electric field readout")).toContainText("4.49 x 10^5 N/C");
  });

  test("has no serious accessibility violations after reveal", async ({ page }) => {
    await mountSim(page, "a-level/physics/electric-fields/charge-field-vector-lab");

    {

      const setupButton = page.getByRole("button", { name: "Set charge position" });

      if ((await setupButton.count()) > 0) {

        await setupButton.first().click();

      }

    }
    await page.getByRole("button", { name: "Reveal field result" }).click();
    await page.getByLabel("To the left").check();
    await page
      .getByLabel("Rationale")
      .fill("A negative test charge feels force opposite to the electric field.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    await page.getByLabel("Observation unlocked").waitFor();

    const results = await new AxeBuilder({ page }).analyze();
    const seriousOrCritical = results.violations.filter(
      (violation) => violation.impact === "critical" || violation.impact === "serious",
    );

    expect(seriousOrCritical).toEqual([]);
  });
});
