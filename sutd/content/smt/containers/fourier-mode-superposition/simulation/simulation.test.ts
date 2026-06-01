import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { expectProductSimulationReveal } from "../../../../../../testing/sim-harness/src/playwright-contract.js";

const simId = "sutd/smt/fourier-mode-superposition/fourier-mode-superposition";
const route = `/?sim=${simId}`;
const predictionOption = "Mode 1, the longest single arch";

test.describe("Fourier Mode Superposition", () => {
  test("satisfies the product reveal visual contract", async ({ page }) => {
    await expectProductSimulationReveal(page, {
      simId,
      setup: [],
      prediction: {
        optionLabel: predictionOption,
        rationale: "The default centre pluck is mostly a single positive arch.",
      },
    });
  });

  test("prediction-checkpoint keeps reconstruction evidence visible while saving reflection", async ({ page }) => {
    await page.goto(route);

    const observation = page.getByRole("region", { name: "Observation unlocked" });
    await expect(observation).toBeVisible();
    await expect(observation).toContainText("Reconstruction evidence");
    await expect(page.getByRole("region", { name: "Formula panel" })).toContainText("Substitution");
    await expect(page.getByRole("form", { name: "Prediction checkpoint" })).toBeVisible();

    await page.getByRole("radio", { name: predictionOption }).check();
    await page
      .getByLabel("Rationale")
      .fill("The default centre pluck is mostly a single positive arch, so the first mode should dominate.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    await expect(observation).toBeVisible();
  });

  test("manipulation changes the revealed dominant mode", async ({ page }) => {
    await page.goto(route);

    await page.getByRole("combobox", { name: "Target shape" }).selectOption({ label: "Two-lobed shape" });

    const observation = page.getByRole("region", { name: "Observation unlocked" });
    await expect(observation).toContainText("Dominant projection");
    await expect(observation).toContainText("Mode 2");
  });

  test("formula, legend, substituted values, units, and interpretation are visible", async ({ page }) => {
    await page.goto(route);

    const panel = page.getByRole("region", { name: "Formula panel" });
    await expect(panel).toContainText("c_n");
    await expect(panel).toContainText("f(x)");
    await expect(panel).toContainText("phi_n");
    await expect(panel).toContainText("E_rms");
    await expect(panel).toContainText("Units:");
    await expect(panel).toContainText("Interpretation:");
  });

  test("has no critical accessibility violations after reveal", async ({ page }) => {
    await page.goto(route);

    await page.getByRole("radio", { name: predictionOption }).check();
    await page.getByLabel("Rationale").fill("The first mode should dominate the default target.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    await page.getByRole("region", { name: "Observation unlocked" }).waitFor();

    const results = await new AxeBuilder({ page }).analyze();
    const highImpactViolations = results.violations.filter(
      (violation) => violation.impact === "critical" || violation.impact === "serious",
    );

    expect(highImpactViolations).toEqual([]);
  });
});
