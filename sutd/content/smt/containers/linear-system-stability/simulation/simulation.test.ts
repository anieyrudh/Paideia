import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("Linear System Stability", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/?sim=sutd/smt/linear-system-stability/linear-system-stability");
  });

  test("prediction-gate blocks stability evidence until commit", async ({ page }) => {
    await expect(page.getByRole("region", { name: "Observation unlocked" })).toHaveCount(0);

    await page.getByRole("button", { name: "Set system matrix" }).click();
    await page.getByRole("button", { name: "Reveal stability" }).click();

    await expect(page.getByRole("form", { name: "Prediction gate" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Observation unlocked" })).toHaveCount(0);

    await page.getByRole("radio", { name: "It spirals inward and settles near the origin" }).check();
    await page
      .getByLabel("Rationale")
      .fill("The trace is negative and the determinant is positive, so the spiral should damp inward.");
    await page.getByRole("button", { name: "Commit prediction" }).click();

    const observation = page.getByRole("region", { name: "Observation unlocked" });
    await expect(observation).toBeVisible();
    await expect(observation).toContainText("Stability evidence");
    await expect(observation).toContainText("Formula panel");
  });

  test("manipulation changes the revealed stability classification", async ({ page }) => {
    await page.getByRole("button", { name: "Set system matrix" }).click();
    await page.getByRole("combobox", { name: "System preset" }).selectOption({ label: "Saddle split" });
    await page.getByRole("button", { name: "Reveal stability" }).click();

    await page.getByRole("radio", { name: "It shoots away along one direction" }).check();
    await page.getByLabel("Rationale").fill("A saddle has one escaping eigendirection.");
    await page.getByRole("button", { name: "Commit prediction" }).click();

    const observation = page.getByRole("region", { name: "Observation unlocked" });
    await expect(observation).toContainText("Saddle");
    await expect(observation).toContainText("one direction settles while another escapes");
  });

  test("formula, legend, substituted values, units, and interpretation are visible", async ({ page }) => {
    await page.getByRole("button", { name: "Set system matrix" }).click();
    await page.getByRole("button", { name: "Reveal stability" }).click();
    await page.getByRole("radio", { name: "It spirals inward and settles near the origin" }).check();
    await page.getByLabel("Rationale").fill("Both real parts are negative for the default system.");
    await page.getByRole("button", { name: "Commit prediction" }).click();

    const panel = page.getByRole("region", { name: "Formula panel" });
    await expect(panel).toContainText("Trace T");
    await expect(panel).toContainText("Determinant D");
    await expect(panel).toContainText("Discriminant Delta");
    await expect(panel).toContainText("T = a + d = 0.00 + -0.60 = -0.60 per time unit");
    await expect(panel).toContainText("per time unit squared");
    await expect(panel).toContainText("Interpretation:");
  });

  test("has no critical accessibility violations after reveal", async ({ page }) => {
    await page.getByRole("button", { name: "Set system matrix" }).click();
    await page.getByRole("button", { name: "Reveal stability" }).click();
    await page.getByRole("radio", { name: "It spirals inward and settles near the origin" }).check();
    await page.getByLabel("Rationale").fill("The negative real part should settle the perturbation.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    await page.getByRole("region", { name: "Observation unlocked" }).waitFor();

    const results = await new AxeBuilder({ page }).analyze();
    const highImpactViolations = results.violations.filter(
      (violation) => violation.impact === "critical" || violation.impact === "serious",
    );

    expect(highImpactViolations).toEqual([]);
  });
});
