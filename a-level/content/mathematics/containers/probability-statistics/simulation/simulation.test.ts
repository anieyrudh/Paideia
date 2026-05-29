import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import {
  expectProductSimulationReveal,
  mountSim,
} from "../../../../../../testing/sim-harness/src/playwright-contract.js";

test.describe("a-level/mathematics/probability-statistics/probability-statistics-lab prediction-gate", () => {
  test("satisfies the product reveal visual contract", async ({ page }) => {
    await expectProductSimulationReveal(page, {
      simId: "a-level/mathematics/probability-statistics/probability-statistics-lab",
      setup: [
        { role: "button", name: "Set up distribution" },
        { role: "button", name: "Reveal decision" },
      ],
      prediction: {
        optionLabel: "The expected score can stay close",
        rationale: "A rare high outcome can preserve the centre while increasing spread.",
      },
    });
  });

  test("prediction-gate blocks distribution readouts until prediction commit", async ({ page }) => {
    await mountSim(page, "a-level/mathematics/probability-statistics/probability-statistics-lab");

    await expect(page.getByLabel("Observation unlocked")).toHaveCount(0);
    await expect(page.getByText("Expected score", { exact: true })).toHaveCount(0);

    await page.getByRole("button", { name: "Set up distribution" }).click();
    await page.getByRole("button", { name: "Reveal decision" }).click();

    await expect(page.getByRole("form", { name: "Prediction gate" })).toBeVisible();
    await expect(page.getByLabel("Observation unlocked")).toHaveCount(0);
    await expect(page.getByText("Expected score", { exact: true })).toHaveCount(0);
    await expect(page.getByText("E(X)").first()).toHaveCount(0);

    await page.getByLabel("The expected score can stay close").check();
    await page
      .getByLabel("Rationale")
      .fill("A rare high outcome can preserve the centre while increasing spread.");
    await page.getByRole("button", { name: "Commit prediction" }).click();

    await expect(page.getByLabel("Observation unlocked")).toBeVisible();
    await expect(page.getByText("Expected score", { exact: true })).toBeVisible();
    await expect(page.getByText("Reject H0")).toBeVisible();
    await expect(page.getByText("E(X)").first()).toBeVisible();
  });

  test("sample size changes the visible decision before reveal", async ({ page }) => {
    await mountSim(page, "a-level/mathematics/probability-statistics/probability-statistics-lab");

    await page.getByRole("button", { name: "Set up distribution" }).click();
    await page.getByLabel("Sample size").fill("16");
    await page.getByRole("button", { name: "Reveal decision" }).click();
    await page.getByLabel("The expected score can stay close").check();
    await page.getByLabel("Rationale").fill("A smaller sample has a wider standard error.");
    await page.getByRole("button", { name: "Commit prediction" }).click();

    await expect(page.getByLabel("Distribution readout")).toContainText("Do not reject H0");
    await expect(page.getByLabel("Formula used")).toContainText("sqrt(16)");
  });

  test("has no serious accessibility violations after reveal", async ({ page }) => {
    await mountSim(page, "a-level/mathematics/probability-statistics/probability-statistics-lab");

    await page.getByRole("button", { name: "Set up distribution" }).click();
    await page.getByRole("button", { name: "Reveal decision" }).click();
    await page.getByLabel("The expected score can stay close").check();
    await page
      .getByLabel("Rationale")
      .fill("The weighted average and standard error answer different parts of the decision.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    await page.getByLabel("Observation unlocked").waitFor();

    const results = await new AxeBuilder({ page }).analyze();
    const seriousOrCritical = results.violations.filter(
      (violation) => violation.impact === "critical" || violation.impact === "serious",
    );

    expect(seriousOrCritical).toEqual([]);
  });
});
