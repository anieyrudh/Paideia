import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("ODE Phase Portrait", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/?sim=shared/math/ode-phase-portrait/ode-phase-portrait");
  });

  test("prediction-checkpoint keeps phase evidence visible while saving reflection", async ({ page }) => {

    {

      const setupButton = page.getByRole("button", { name: "Set phase plane" });

      if ((await setupButton.count()) > 0) {

        await setupButton.first().click();

      }

    }
    await page.getByRole("button", { name: "Reveal phase portrait" }).click();

    await expect(page.getByRole("form", { name: "Prediction checkpoint" })).toBeVisible();

    await page.getByRole("radio", { name: "Spiral inward toward the equilibrium" }).check();
    await page
      .getByLabel("Rationale")
      .fill("The trace is negative and the determinant is positive, so nearby trajectories should damp inward.");
    await page.getByRole("button", { name: "Commit prediction" }).click();

    const observation = page.getByRole("region", { name: "Observation unlocked" });
    await expect(observation).toBeVisible();
    await expect(observation).toContainText("Phase portrait evidence");
    await expect(observation).toContainText("Formula used");
    await expect(observation).toContainText("Substitute trace: T = a + d");
    await expect(observation).toContainText("Formula legend");
    await expect(observation).not.toContainText("\\color");
  });

  test("manipulation changes the revealed stability classification", async ({ page }) => {
    {
      const setupButton = page.getByRole("button", { name: "Set phase plane" });
      if ((await setupButton.count()) > 0) {
        await setupButton.first().click();
      }
    }
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
    {
      const setupButton = page.getByRole("button", { name: "Set phase plane" });
      if ((await setupButton.count()) > 0) {
        await setupButton.first().click();
      }
    }
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
