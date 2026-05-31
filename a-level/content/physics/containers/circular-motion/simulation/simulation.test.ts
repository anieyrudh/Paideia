import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { mountSim } from "../../../../../../testing/sim-harness/src/playwright-contract.js";

test.describe("a-level/physics/circular-motion/centripetal-force-vector-lab prediction-checkpoint", () => {
  test("prediction-checkpoint keeps radial force readouts visible while saving reflection", async ({ page }) => {
    await mountSim(page, "a-level/physics/circular-motion/centripetal-force-vector-lab");

    {

      const setupButton = page.getByRole("button", { name: "Set up circular path" });

      if ((await setupButton.count()) > 0) {

        await setupButton.first().click();

      }

    }
    await page.getByRole("button", { name: "Reveal force vectors" }).click();

    await expect(page.getByRole("form", { name: "Prediction checkpoint" })).toBeVisible();

    await page.getByLabel("Toward the centre of the circle").check();
    await page
      .getByLabel("Rationale")
      .fill("The velocity changes direction, so acceleration points toward the centre.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    await expect(page.getByText("Radial acceleration")).toBeVisible();
    await expect(page.getByLabel("Circular motion readout")).toContainText("9.00 m s^-2");
    await expect(page.getByText("F_c = m a_c").first()).toBeVisible();
  });

  test("has no serious accessibility violations after reveal", async ({ page }) => {
    await mountSim(page, "a-level/physics/circular-motion/centripetal-force-vector-lab");

    {

      const setupButton = page.getByRole("button", { name: "Set up circular path" });

      if ((await setupButton.count()) > 0) {

        await setupButton.first().click();

      }

    }
    await page.getByRole("button", { name: "Reveal force vectors" }).click();
    await page.getByLabel("Toward the centre of the circle").check();
    await page
      .getByLabel("Rationale")
      .fill("Velocity direction changes continuously, so acceleration is radial.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    await page.getByLabel("Observation unlocked").waitFor();

    const results = await new AxeBuilder({ page }).analyze();
    const seriousOrCritical = results.violations.filter(
      (violation) => violation.impact === "critical" || violation.impact === "serious",
    );

    expect(seriousOrCritical).toEqual([]);
  });

  test("reveals formula legend, substitution, units, and interpretation", async ({ page }) => {
    await mountSim(page, "a-level/physics/circular-motion/centripetal-force-vector-lab");

    {

      const setupButton = page.getByRole("button", { name: "Set up circular path" });

      if ((await setupButton.count()) > 0) {

        await setupButton.first().click();

      }

    }
    await page.getByRole("slider", { name: "Speed" }).fill("8");
    await page.getByRole("button", { name: "Reveal force vectors" }).click();
    await page.getByLabel("Toward the centre of the circle").check();
    await page.getByLabel("Rationale").fill("The centre direction changes velocity direction.");
    await page.getByRole("button", { name: "Commit prediction" }).click();

    await expect(page.getByLabel("Formula legend")).toContainText("v: speed along the tangent");
    await expect(page.getByLabel("Formula used")).toContainText(
      "a_c = (8.00 m s^-1)^2 / 4.00 m = 16.00 m s^-2",
    );
    await expect(page.getByLabel("Formula used")).toContainText("= 19.20 N");
    await expect(page.getByLabel("Formula used")).toContainText(
      "constant speed only means the size of the velocity is fixed",
    );
  });
});
