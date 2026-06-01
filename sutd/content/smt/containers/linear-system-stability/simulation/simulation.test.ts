import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { expectProductSimulationReveal } from "../../../../../../testing/sim-harness/src/playwright-contract.js";

const simId = "sutd/smt/linear-system-stability/linear-system-stability";
const route = `/?sim=${simId}`;
const predictionOption = "It spirals inward and settles near the origin";

test.describe("Linear System Stability", () => {
  test("satisfies the product reveal visual contract", async ({ page }) => {
    await expectProductSimulationReveal(page, {
      simId,
      setup: [],
      prediction: {
        optionLabel: predictionOption,
        rationale: "Negative trace and positive determinant give complex eigenvalues with negative real part.",
      },
    });
  });

  test("prediction-checkpoint keeps stability evidence visible while saving reflection", async ({ page }) => {
    await page.goto(route);

    const observation = page.getByRole("region", { name: "Observation unlocked" });
    await expect(observation).toBeVisible();
    await expect(observation).toContainText("Stability evidence");
    await expect(page.getByRole("form", { name: "Prediction checkpoint" })).toBeVisible();

    await page.getByRole("radio", { name: predictionOption }).check();
    await page
      .getByLabel("Rationale")
      .fill("The trace is negative and the determinant is positive, so the spiral should damp inward.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    await expect(observation).toBeVisible();
  });

  test("manipulation changes the revealed stability classification", async ({ page }) => {
    await page.goto(route);

    await page.getByRole("combobox", { name: "System preset" }).selectOption({ label: "Saddle split" });

    const observation = page.getByRole("region", { name: "Observation unlocked" });
    await expect(observation).toContainText("Saddle");
    await expect(observation).toContainText("one direction settles while another escapes");
  });

  test("formula, legend, substituted values, units, and interpretation are visible", async ({ page }) => {
    await page.goto(route);

    const panel = page.getByRole("region", { name: "Formula panel" });
    await expect(panel).toContainText("Trace T");
    await expect(panel).toContainText("Determinant D");
    await expect(panel).toContainText("Discriminant Delta");
    await expect(panel).toContainText("per time unit");
    await expect(panel).toContainText("Interpretation:");
  });

  test("has no critical accessibility violations after reveal", async ({ page }) => {
    await page.goto(route);

    await page.getByRole("radio", { name: predictionOption }).check();
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
