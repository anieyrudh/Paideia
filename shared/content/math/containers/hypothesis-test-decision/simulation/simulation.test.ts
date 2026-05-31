import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { mountSim } from "../../../../../../testing/sim-harness/src/playwright-contract.js";

const simId = "shared/math/hypothesis-test-decision/hypothesis-test-decision";

test.describe("Hypothesis Test Decision Lab", () => {
  test("prediction-checkpoint keeps decision reveal visible while saving reflection", async ({ page }) => {
    await mountSim(page, simId);

    await expect(page.getByRole("form", { name: "Prediction checkpoint" })).toBeVisible();

    await page
      .getByLabel(
        "Do not reject the null hypothesis because the z statistic is below the 5% critical boundary.",
      )
      .check();
    await page.getByLabel("Rationale").fill("The z statistic is not large enough for alpha 5%.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    await expect(page.getByLabel("Formula used")).toContainText("z =");
  });

  test("sample-size manipulation changes the standard-error and decision readouts", async ({ page }) => {
    await mountSim(page, simId);
    await page
      .getByLabel(
        "Do not reject the null hypothesis because the z statistic is below the 5% critical boundary.",
      )
      .check();
    await page.getByLabel("Rationale").fill("The observed mean must be scaled by standard error.");
    await page.getByRole("button", { name: "Commit prediction" }).click();

    await expect(page.getByLabel("Decision readout")).toContainText("Do not reject");
    await expect(page.getByLabel("Decision readout")).toContainText("1.00");
    await page.getByRole("spinbutton", { name: "Sample size" }).fill("64");
    await expect(page.getByLabel("Decision readout")).toContainText("0.75");
    await expect(page.getByLabel("Decision readout")).toContainText("Reject");
  });

  test("revealed decision state has no serious accessibility violations", async ({ page }) => {
    await mountSim(page, simId);
    await page
      .getByLabel(
        "Do not reject the null hypothesis because the z statistic is below the 5% critical boundary.",
      )
      .check();
    await page.getByLabel("Rationale").fill("A decision needs the critical region, not just direction.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    await page.getByLabel("Observation unlocked").waitFor();

    const results = await new AxeBuilder({ page }).analyze();
    const seriousOrCritical = results.violations.filter(
      (violation) => violation.impact === "critical" || violation.impact === "serious",
    );

    expect(seriousOrCritical).toEqual([]);
  });
});
