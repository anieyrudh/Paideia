import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { expectProductSimulationReveal } from "../../../../../../testing/sim-harness/src/playwright-contract.js";

const simId = "sutd/asd/load-path-and-daylight-tradeoff/load-path-and-daylight-tradeoff";
const route = `/?sim=${simId}`;
const predictionOption = "Medium opening with diagonal brace";

test.describe("Load Path and Daylight Tradeoff", () => {
  test("satisfies the product reveal visual contract", async ({ page }) => {
    await expectProductSimulationReveal(page, {
      simId,
      setup: [],
      prediction: {
        optionLabel: predictionOption,
        rationale: "A medium opening keeps daylight while the diagonal brace gives lateral load a path.",
      },
    });
  });

  test("prediction-checkpoint keeps tradeoff evidence visible while saving reflection", async ({ page }) => {
    await page.goto(route);

    const observation = page.getByRole("region", { name: "Observation unlocked" });
    await expect(observation).toBeVisible();
    await expect(observation).toContainText("Load path and daylight evidence");
    await expect(observation).toContainText("Formula trail");
    await expect(observation).toContainText("Daylight proxy = opening ratio");
    await expect(page.getByRole("form", { name: "Prediction checkpoint" })).toBeVisible();

    await page.getByRole("radio", { name: predictionOption }).check();
    await page
      .getByLabel("Rationale")
      .fill("A medium opening keeps enough daylight while the diagonal brace gives the lateral load a path.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    await expect(observation).toBeVisible();
  });

  test("manipulation changes the daylight and residual readouts", async ({ page }) => {
    await page.goto(route);

    await page.getByRole("combobox", { name: "Structural system" }).selectOption({ label: "Moment frame" });
    await page.getByRole("slider", { name: "Opening ratio" }).fill("0.75");
    await page.getByRole("slider", { name: "Lateral load" }).fill("36");

    const observation = page.getByRole("region", { name: "Observation unlocked" });
    await expect(observation).toContainText("72.0 / 100");
    await expect(observation).toContainText("unbalanced lateral demand");
  });

  test("has no critical accessibility violations after reveal", async ({ page }) => {
    await page.goto(route);

    await page.getByRole("radio", { name: predictionOption }).check();
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
