import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { mountSim } from "../../../../../../testing/sim-harness/src/playwright-contract.js";

test.describe("a-level/physics/momentum/momentum-collision-lab prediction-checkpoint", () => {
  test("prediction-checkpoint keeps collision readouts visible while saving reflection", async ({ page }) => {
    await mountSim(page, "a-level/physics/momentum/momentum-collision-lab");

    {

      const setupButton = page.getByRole("button", { name: "Set up collision" });

      if ((await setupButton.count()) > 0) {

        await setupButton.first().click();

      }

    }
    await page.getByRole("button", { name: "Reveal collision result" }).click();

    await expect(page.getByRole("form", { name: "Prediction checkpoint" })).toBeVisible();

    await page.getByLabel("Total momentum stays constant").check();
    await page
      .getByLabel("Rationale")
      .fill("The horizontal forces are internal to the two-cart system.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    await expect(page.getByText("Total momentum before")).toBeVisible();
    await expect(page.getByText("+0.50 kg m s^-1").first()).toBeVisible();
    await expect(page.getByText("p = mv").first()).toBeVisible();
  });

  test("has no serious accessibility violations after reveal", async ({ page }) => {
    await mountSim(page, "a-level/physics/momentum/momentum-collision-lab");

    {

      const setupButton = page.getByRole("button", { name: "Set up collision" });

      if ((await setupButton.count()) > 0) {

        await setupButton.first().click();

      }

    }
    await page.getByRole("button", { name: "Reveal collision result" }).click();
    await page.getByLabel("Total momentum stays constant").check();
    await page
      .getByLabel("Rationale")
      .fill("Momentum is conserved for the isolated pair, even though each cart changes momentum.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    await page.getByLabel("Observation unlocked").waitFor();

    const results = await new AxeBuilder({ page }).analyze();
    const seriousOrCritical = results.violations.filter(
      (violation) => violation.impact === "critical" || violation.impact === "serious",
    );

    expect(seriousOrCritical).toEqual([]);
  });
});
