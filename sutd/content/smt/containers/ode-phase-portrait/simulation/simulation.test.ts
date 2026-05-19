import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("ODE Phase Portrait", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/?sim=sutd/smt/ode-phase-portrait/ode-phase-portrait");
  });

  test("prediction-gate blocks phase evidence until commit", async ({ page }) => {
    await expect(page.getByRole("region", { name: "Observation unlocked" })).toHaveCount(0);

    await page.getByRole("button", { name: "Set phase plane" }).click();
    await page.getByRole("button", { name: "Reveal phase portrait" }).click();

    await expect(page.getByRole("form", { name: "Prediction gate" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Observation unlocked" })).toHaveCount(0);

    await page.getByRole("radio", { name: "Spiral inward toward the equilibrium" }).check();
    await page
      .getByLabel("Rationale")
      .fill("The trace is negative and the determinant is positive, so nearby trajectories should damp inward.");
    await page.getByRole("button", { name: "Commit prediction" }).click();

    const observation = page.getByRole("region", { name: "Observation unlocked" });
    await expect(observation).toBeVisible();
    await expect(observation).toContainText("Phase portrait evidence");
    await expect(observation).toContainText("Formula trail");
    await expect(observation).toContainText("Trace formula: T = a + d");
  });

  test("manipulation changes the revealed stability classification", async ({ page }) => {
    await page.getByRole("button", { name: "Set phase plane" }).click();
    await page.getByRole("combobox", { name: "Portrait preset" }).selectOption({ label: "Saddle" });
    await page.getByRole("button", { name: "Reveal phase portrait" }).click();

    await page.getByRole("radio", { name: "Move directly away from the equilibrium" }).check();
    await page.getByLabel("Rationale").fill("This checks the unstable direction of a saddle case.");
    await page.getByRole("button", { name: "Commit prediction" }).click();

    const observation = page.getByRole("region", { name: "Observation unlocked" });
    await expect(observation).toContainText("Saddle");
    await expect(observation).toContainText("one direction approaches while another escapes");
  });

  test("has no critical accessibility violations after reveal", async ({ page }) => {
    await page.getByRole("button", { name: "Set phase plane" }).click();
    await page.getByRole("button", { name: "Reveal phase portrait" }).click();
    await page.getByRole("radio", { name: "Spiral inward toward the equilibrium" }).check();
    await page.getByLabel("Rationale").fill("Negative trace with positive determinant creates inward damping.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    await page.getByRole("region", { name: "Observation unlocked" }).waitFor();

    const results = await new AxeBuilder({ page }).analyze();
    const highImpactViolations = results.violations.filter(
      (violation) => violation.impact === "critical" || violation.impact === "serious",
    );

    expect(highImpactViolations).toEqual([]);
  });
});
