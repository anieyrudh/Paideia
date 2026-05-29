import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("Load Path and Daylight Tradeoff", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/?sim=sutd/asd/load-path-and-daylight-tradeoff/load-path-and-daylight-tradeoff");
  });

  test("prediction-checkpoint keeps tradeoff evidence visible while saving reflection", async ({ page }) => {

    {

      const setupButton = page.getByRole("button", { name: "Set bay options" });

      if ((await setupButton.count()) > 0) {

        await setupButton.first().click();

      }

    }
    await page.getByRole("button", { name: "Reveal tradeoff" }).click();

    await expect(page.getByRole("form", { name: "Prediction checkpoint" })).toBeVisible();

    await page.getByRole("radio", { name: "Medium opening with diagonal brace" }).check();
    await page
      .getByLabel("Rationale")
      .fill("A medium opening keeps enough daylight while the diagonal brace gives the lateral load a path.");
    await page.getByRole("button", { name: "Commit prediction" }).click();

    const observation = page.getByRole("region", { name: "Observation unlocked" });
    await expect(observation).toBeVisible();
    await expect(observation).toContainText("Load path and daylight evidence");
    await expect(observation).toContainText("Formula trail");
    await expect(observation).toContainText("Daylight proxy = opening ratio");
  });

  test("manipulation changes the daylight and residual readouts", async ({ page }) => {
    {
      const setupButton = page.getByRole("button", { name: "Set bay options" });
      if ((await setupButton.count()) > 0) {
        await setupButton.first().click();
      }
    }
    await page.getByRole("combobox", { name: "Structural system" }).selectOption({ label: "Moment frame" });
    await page.getByRole("slider", { name: "Opening ratio" }).fill("0.75");
    await page.getByRole("slider", { name: "Lateral load" }).fill("36");
    await page.getByRole("button", { name: "Reveal tradeoff" }).click();

    await page.getByRole("radio", { name: "Large opening with no brace" }).check();
    await page.getByLabel("Rationale").fill("This tests whether a large opening without bracing leaves residual force.");
    await page.getByRole("button", { name: "Commit prediction" }).click();

    const observation = page.getByRole("region", { name: "Observation unlocked" });
    await expect(observation).toContainText("72.0 / 100");
    await expect(observation).toContainText("unbalanced lateral demand");
  });

  test("has no critical accessibility violations after reveal", async ({ page }) => {
    {
      const setupButton = page.getByRole("button", { name: "Set bay options" });
      if ((await setupButton.count()) > 0) {
        await setupButton.first().click();
      }
    }
    await page.getByRole("button", { name: "Reveal tradeoff" }).click();
    await page.getByRole("radio", { name: "Medium opening with diagonal brace" }).check();
    await page.getByLabel("Rationale").fill("The diagonal brace gives lateral load a direct path.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    await page.getByRole("region", { name: "Observation unlocked" }).waitFor();

    const results = await new AxeBuilder({ page }).analyze();
    const criticalViolations = results.violations.filter(
      (violation) => violation.impact === "critical",
    );

    expect(criticalViolations).toEqual([]);
  });
});
