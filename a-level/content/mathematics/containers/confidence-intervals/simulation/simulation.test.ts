import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { mountSim } from "../../../../../../testing/sim-harness/src/playwright-contract.js";

test.describe("a-level/mathematics/confidence-intervals/mean-interval-lab prediction-checkpoint", () => {
  test("prediction-checkpoint keeps interval readouts visible while saving reflection", async ({ page }) => {
    await mountSim(page, "a-level/mathematics/confidence-intervals/mean-interval-lab");

    {

      const setupButton = page.getByRole("button", { name: "Set up interval" });

      if ((await setupButton.count()) > 0) {

        await setupButton.first().click();

      }

    }
    await page.getByRole("button", { name: "Reveal interval" }).click();

    await expect(page.getByRole("form", { name: "Prediction checkpoint" })).toBeVisible();

    await page.getByLabel("The interval becomes wider").check();
    await page
      .getByLabel("Rationale")
      .fill("Higher confidence requires a larger multiplier, so the margin is wider.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    await expect(page.getByText("Margin of error", { exact: true })).toBeVisible();
    await expect(page.getByText("Claim lies outside")).toBeVisible();
    await expect(page.getByText("CI = 68.00").first()).toBeVisible();
  });

  test("sample size changes the visible margin before reveal", async ({ page }) => {
    await mountSim(page, "a-level/mathematics/confidence-intervals/mean-interval-lab");

    {

      const setupButton = page.getByRole("button", { name: "Set up interval" });

      if ((await setupButton.count()) > 0) {

        await setupButton.first().click();

      }

    }
    await page.getByRole("slider", { name: "Sample size" }).fill("81");
    await page.getByRole("button", { name: "Reveal interval" }).click();
    await page.getByLabel("The interval becomes wider").check();
    await page.getByLabel("Rationale").fill("The standard error is sigma over square root n.");
    await page.getByRole("button", { name: "Commit prediction" }).click();

    await expect(page.getByLabel("Interval readout")).toContainText("Margin of error");
    await expect(page.getByLabel("Formula used")).toContainText("sqrt(81)");
    await expect(page.getByLabel("Formula used")).toContainText("1.960");
  });

  test("has no serious accessibility violations after reveal", async ({ page }) => {
    await mountSim(page, "a-level/mathematics/confidence-intervals/mean-interval-lab");

    {

      const setupButton = page.getByRole("button", { name: "Set up interval" });

      if ((await setupButton.count()) > 0) {

        await setupButton.first().click();

      }

    }
    await page.getByRole("button", { name: "Reveal interval" }).click();
    await page.getByLabel("The interval becomes wider").check();
    await page
      .getByLabel("Rationale")
      .fill("Confidence describes the method before sampling, not a probability after sampling.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    await page.getByLabel("Observation unlocked").waitFor();

    const results = await new AxeBuilder({ page }).analyze();
    const seriousOrCritical = results.violations.filter(
      (violation) => violation.impact === "critical" || violation.impact === "serious",
    );

    expect(seriousOrCritical).toEqual([]);
  });
});
