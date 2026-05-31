import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import {
  expectProductSimulationExperience,
  expectRevealedSimulationVisual,
} from "../../../../../../testing/sim-harness/src/playwright-contract.js";

test.describe("PID Step Response", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/?sim=sutd/epd/pid-step-response/pid-step-response");
  });

  test("satisfies the product reveal visual contract", async ({ page }) => {
    await expectProductSimulationExperience(page, {
      simId: "sutd/epd/pid-step-response/pid-step-response",
      setup: [],
      prediction: {
        optionLabel: "Increase Ki moderately",
        rationale: "Integral action should reduce final error, but too much can increase overshoot.",
      },
      observation: { observationLabel: "Observation" },
    });
  });

  test("prediction-checkpoint keeps observation visible while saving reflection", async ({ page }) => {

    await expect(page.getByRole("form", { name: "Prediction checkpoint" })).toBeVisible();
    await expect(page.getByRole("img", { name: "Step response chart, output against time in seconds" })).toBeVisible();

    await page.getByLabel("Increase Ki moderately").check();
    await page
      .getByLabel("Rationale")
      .fill("Integral action should reduce final error, but too much can increase overshoot.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    await expect(page.getByRole("img", { name: "Step response chart, output against time in seconds" })).toBeVisible();
    await expect(page.getByRole("img", { name: "PID feedback loop diagram" })).toBeVisible();
    await expect(page.getByLabel("Formula used")).toContainText("e_ss");
    await expectRevealedSimulationVisual(page, "Observation");
  });

  test("manipulate controls write to response metrics", async ({ page }) => {
    await page.getByLabel("Proportional gain Kp").focus();
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    await page.getByLabel("Integral gain Ki").focus();
    await page.keyboard.press("ArrowRight");
    await page.getByLabel("Increase Ki moderately").check();
    await page.getByLabel("Rationale").fill("I want to compare a stronger integral term.");
    await page.getByRole("button", { name: "Commit prediction" }).click();

    const observation = page.getByRole("region", { name: "Observation" });
    await expect(observation).toContainText("Kp = 1.4");
    await expect(observation).toContainText("Ki = 0.85");
    await expect(observation).toContainText("Final error");
    await expect(page.getByRole("img", { name: "Step response chart, output against time in seconds" })).toBeVisible();
    await expectRevealedSimulationVisual(page, "Observation");
  });

  test("shows chart, formula legend, substitutions, units, and feedback loop", async ({ page }) => {
    await page.getByLabel("Increase Ki moderately").check();
    await page
      .getByLabel("Rationale")
      .fill("I need the plotted response to compare overshoot, settling time, and final error.");
    await page.getByRole("button", { name: "Commit prediction" }).click();

    await expect(page.getByRole("img", { name: "Step response chart, output against time in seconds" })).toBeVisible();
    await expect(page.getByRole("img", { name: "PID feedback loop diagram" })).toBeVisible();
    await expect(page.getByLabel("Formula used")).toContainText("overshoot %");
    await expect(page.getByLabel("Formula used")).toContainText("Substitution");
    await expect(page.getByLabel("Formula used")).toContainText("s");
    await expect(page.getByLabel("Formula legend")).toContainText("y(t)");
    await expect(page.getByLabel("Formula legend")).toContainText("target");
    await expectRevealedSimulationVisual(page, "Observation");
  });

  test("has no critical accessibility violations after reveal", async ({ page }) => {
    await page.getByLabel("Increase Ki moderately").check();
    await page
      .getByLabel("Rationale")
      .fill("A gain choice needs evidence from overshoot, settling time, and final error.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    await page.getByRole("region", { name: "Observation" }).waitFor();

    const results = await new AxeBuilder({ page }).analyze();
    const seriousOrCritical = results.violations.filter(
      (violation) => violation.impact === "critical" || violation.impact === "serious",
    );

    expect(seriousOrCritical).toEqual([]);
  });
});
