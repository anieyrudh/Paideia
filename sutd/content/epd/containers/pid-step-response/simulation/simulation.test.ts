import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import {
  expectProductSimulationReveal,
  expectRevealedSimulationVisual,
} from "../../../../../../testing/sim-harness/src/playwright-contract.js";

test.describe("PID Step Response", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/?sim=sutd/epd/pid-step-response/pid-step-response");
  });

  test("satisfies the product reveal visual contract", async ({ page }) => {
    await expectProductSimulationReveal(page, {
      simId: "sutd/epd/pid-step-response/pid-step-response",
      setup: [
        { role: "button", name: "Start tuning" },
        { role: "button", name: "Observe response" },
      ],
      prediction: {
        optionLabel: "Increase Ki moderately",
        rationale: "Integral action should reduce final error, but too much can increase overshoot.",
      },
    });
  });

  test("prediction-gate blocks observation until commit", async ({ page }) => {
    await expect(page.getByRole("region", { name: "Observation unlocked" })).toHaveCount(0);

    await page.getByRole("button", { name: "Start tuning" }).click();
    await page.getByRole("button", { name: "Observe response" }).click();

    await expect(page.getByRole("form", { name: "Prediction gate" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Observation unlocked" })).toHaveCount(0);

    await page.getByLabel("Increase Ki moderately").check();
    await page
      .getByLabel("Rationale")
      .fill("Integral action should reduce final error, but too much can increase overshoot.");
    await page.getByRole("button", { name: "Commit prediction" }).click();

    await expect(page.getByRole("region", { name: "Observation unlocked" })).toBeVisible();
    await expect(page.getByRole("img", { name: "Step response chart, output against time in seconds" })).toBeVisible();
    await expect(page.getByRole("img", { name: "PID feedback loop diagram" })).toBeVisible();
    await expect(page.getByLabel("Formula used")).toContainText("e_ss");
    await expectRevealedSimulationVisual(page);
  });

  test("manipulate controls write to response metrics", async ({ page }) => {
    await page.getByRole("button", { name: "Start tuning" }).click();

    await page.getByLabel("Proportional gain Kp").focus();
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    await page.getByLabel("Integral gain Ki").focus();
    await page.keyboard.press("ArrowRight");
    await page.getByRole("button", { name: "Observe response" }).click();
    await page.getByLabel("Increase Ki moderately").check();
    await page.getByLabel("Rationale").fill("I want to compare a stronger integral term.");
    await page.getByRole("button", { name: "Commit prediction" }).click();

    const observation = page.getByRole("region", { name: "Observation unlocked" });
    await expect(observation).toContainText("Kp = 1.4");
    await expect(observation).toContainText("Ki = 0.85");
    await expect(observation).toContainText("Final error");
    await expect(page.getByRole("img", { name: "Step response chart, output against time in seconds" })).toBeVisible();
    await expectRevealedSimulationVisual(page);
  });

  test("shows chart, formula legend, substitutions, units, and feedback loop", async ({ page }) => {
    await page.getByRole("button", { name: "Start tuning" }).click();
    await page.getByRole("button", { name: "Observe response" }).click();
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
    await expectRevealedSimulationVisual(page);
  });

  test("has no critical accessibility violations after reveal", async ({ page }) => {
    await page.getByRole("button", { name: "Start tuning" }).click();
    await page.getByRole("button", { name: "Observe response" }).click();
    await page.getByLabel("Increase Ki moderately").check();
    await page
      .getByLabel("Rationale")
      .fill("A gain choice needs evidence from overshoot, settling time, and final error.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    await page.getByRole("region", { name: "Observation unlocked" }).waitFor();

    const results = await new AxeBuilder({ page }).analyze();
    const seriousOrCritical = results.violations.filter(
      (violation) => violation.impact === "critical" || violation.impact === "serious",
    );

    expect(seriousOrCritical).toEqual([]);
  });
});
