import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("PID Step Response", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/?sim=sutd/epd/pid-step-response/pid-step-response");
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
    await expect(page.getByText("Formula used: e_ss")).toBeVisible();
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
    await expect(observation).toContainText("Gains: Kp = 1.4");
    await expect(observation).toContainText("Ki = 0.85");
    await expect(observation).toContainText("steady-state error");
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
    const criticalViolations = results.violations.filter(
      (violation) => violation.impact === "critical",
    );

    expect(criticalViolations).toEqual([]);
  });
});
