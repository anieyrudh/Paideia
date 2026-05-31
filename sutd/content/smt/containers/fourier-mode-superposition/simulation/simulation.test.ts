import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("Fourier Mode Superposition", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/?sim=sutd/smt/fourier-mode-superposition/fourier-mode-superposition");
  });

  test("prediction-checkpoint keeps reconstruction evidence visible while saving reflection", async ({ page }) => {

    {

      const setupButton = page.getByRole("button", { name: "Set coefficients" });

      if ((await setupButton.count()) > 0) {

        await setupButton.first().click();

      }

    }
    await page.getByRole("button", { name: "Reveal reconstruction" }).click();

    await expect(page.getByRole("form", { name: "Prediction checkpoint" })).toBeVisible();

    await page.getByRole("radio", { name: "Mode 1, the longest single arch" }).check();
    await page
      .getByLabel("Rationale")
      .fill("The default centre pluck is mostly a single positive arch, so the first mode should dominate.");
    await page.getByRole("button", { name: "Commit prediction" }).click();

    const observation = page.getByRole("region", { name: "Observation unlocked" });
    await expect(observation).toBeVisible();
    await expect(observation).toContainText("Reconstruction evidence");
    await expect(page.getByRole("region", { name: "Formula panel" })).toContainText("Substitution");
  });

  test("manipulation changes the revealed dominant mode", async ({ page }) => {
    {
      const setupButton = page.getByRole("button", { name: "Set coefficients" });
      if ((await setupButton.count()) > 0) {
        await setupButton.first().click();
      }
    }
    await page.getByRole("combobox", { name: "Target shape" }).selectOption({ label: "Two-lobed shape" });
    await page.getByRole("button", { name: "Reveal reconstruction" }).click();

    await page.getByRole("radio", { name: "Mode 2, the two-lobed shape" }).check();
    await page
      .getByLabel("Rationale")
      .fill("The target changes sign once, matching the second sine basis shape.");
    await page.getByRole("button", { name: "Commit prediction" }).click();

    const observation = page.getByRole("region", { name: "Observation unlocked" });
    await expect(observation).toContainText("Dominant projection");
    await expect(observation).toContainText("Mode 2");
  });

  test("formula, legend, substituted values, units, and interpretation are visible", async ({ page }) => {
    {
      const setupButton = page.getByRole("button", { name: "Set coefficients" });
      if ((await setupButton.count()) > 0) {
        await setupButton.first().click();
      }
    }
    await page.getByRole("button", { name: "Reveal reconstruction" }).click();
    await page.getByRole("radio", { name: "Mode 1, the longest single arch" }).check();
    await page.getByLabel("Rationale").fill("The broad default shape aligns with the longest arch.");
    await page.getByRole("button", { name: "Commit prediction" }).click();

    const panel = page.getByRole("region", { name: "Formula panel" });
    await expect(panel).toContainText("c_n");
    await expect(panel).toContainText("f(x)");
    await expect(panel).toContainText("phi_n");
    await expect(panel).toContainText("E_rms");
    await expect(panel).toContainText("m");
    await expect(panel).toContainText("Interpretation:");
  });

  test("has no critical accessibility violations after reveal", async ({ page }) => {
    {
      const setupButton = page.getByRole("button", { name: "Set coefficients" });
      if ((await setupButton.count()) > 0) {
        await setupButton.first().click();
      }
    }
    await page.getByRole("button", { name: "Reveal reconstruction" }).click();
    await page.getByRole("radio", { name: "Mode 1, the longest single arch" }).check();
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
