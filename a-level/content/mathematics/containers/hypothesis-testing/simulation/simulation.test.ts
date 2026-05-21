import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { mountSim } from "../../../../../../testing/sim-harness/src/playwright-contract.js";

test.describe("a-level/mathematics/hypothesis-testing/test-statistic-decision-lab prediction-gate", () => {
  test("prediction-gate blocks decision readouts until prediction commit", async ({ page }) => {
    await mountSim(page, "a-level/mathematics/hypothesis-testing/test-statistic-decision-lab");

    await expect(page.getByLabel("Observation unlocked")).toHaveCount(0);
    await expect(page.getByText("Test statistic", { exact: true })).toHaveCount(0);

    await page.getByRole("button", { name: "Set up test" }).click();
    await page.getByRole("button", { name: "Reveal decision" }).click();

    await expect(page.getByRole("form", { name: "Prediction gate" })).toBeVisible();
    await expect(page.getByLabel("Observation unlocked")).toHaveCount(0);
    await expect(page.getByText("Test statistic", { exact: true })).toHaveCount(0);
    await expect(page.getByText("p-value comparison").first()).toHaveCount(0);

    await page.getByLabel("The evidence strengthens").check();
    await page
      .getByLabel("Rationale")
      .fill("A larger sample makes the standard error smaller when sigma is fixed.");
    await page.getByRole("button", { name: "Commit prediction" }).click();

    await expect(page.getByLabel("Observation unlocked")).toBeVisible();
    await expect(page.getByText("Test statistic", { exact: true })).toBeVisible();
    await expect(page.getByText("Reject H0")).toBeVisible();
    await expect(page.getByText("p-value comparison")).toBeVisible();
  });

  test("sample size changes the visible decision before reveal", async ({ page }) => {
    await mountSim(page, "a-level/mathematics/hypothesis-testing/test-statistic-decision-lab");

    await page.getByRole("button", { name: "Set up test" }).click();
    await page.getByLabel("Sample size").fill("16");
    await page.getByRole("button", { name: "Reveal decision" }).click();
    await page.getByLabel("The evidence strengthens").check();
    await page.getByLabel("Rationale").fill("A smaller sample has a wider standard error.");
    await page.getByRole("button", { name: "Commit prediction" }).click();

    await expect(page.getByLabel("Decision readout")).toContainText("Do not reject H0");
    await expect(page.getByLabel("Formula used")).toContainText("sqrt(16)");
  });

  test("has no serious accessibility violations after reveal", async ({ page }) => {
    await mountSim(page, "a-level/mathematics/hypothesis-testing/test-statistic-decision-lab");

    await page.getByRole("button", { name: "Set up test" }).click();
    await page.getByRole("button", { name: "Reveal decision" }).click();
    await page.getByLabel("The evidence strengthens").check();
    await page
      .getByLabel("Rationale")
      .fill("The p-value comparison describes rarity under H0, not the probability of H0.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    await page.getByLabel("Observation unlocked").waitFor();

    const results = await new AxeBuilder({ page }).analyze();
    const seriousOrCritical = results.violations.filter(
      (violation) => violation.impact === "critical" || violation.impact === "serious",
    );

    expect(seriousOrCritical).toEqual([]);
  });
});
