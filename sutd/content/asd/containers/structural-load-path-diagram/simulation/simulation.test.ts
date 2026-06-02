import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { expectProductSimulationReveal } from "../../../../../../testing/sim-harness/src/playwright-contract.js";

const simId = "sutd/asd/structural-load-path-diagram/structural-load-path-diagram";
const route = `/?sim=${simId}`;
const predictionOption = "The diagonal brace force, because it resolves the sideways load.";

test.describe("Structural Load Path Diagram", () => {
  test("satisfies the product reveal visual contract", async ({ page }) => {
    await expectProductSimulationReveal(page, {
      simId,
      setup: [],
      prediction: {
        optionLabel: predictionOption,
        rationale: "The diagonal carries the horizontal load as axial force, so it governs the path.",
      },
      observation: { observationLabel: "Load path evidence" },
    });
  });

  test("prediction-checkpoint keeps load path evidence visible while saving reflection", async ({ page }) => {
    await page.goto(route);

    const observation = page.getByRole("region", { name: "Load path evidence" });
    await expect(observation).toBeVisible();
    await expect(observation).toContainText("Structural load path evidence");
    await expect(observation).toContainText("Formula trail");
    await expect(observation).toContainText("Substitution: F_b");
    await expect(page.getByRole("form", { name: "Prediction checkpoint" })).toBeVisible();

    await page.getByRole("radio", { name: predictionOption }).check();
    await page
      .getByLabel("Rationale")
      .fill("The diagonal must provide the horizontal component that balances the sideways load.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    await expect(observation).toBeVisible();
  });

  test("manipulation changes the brace demand and revealed interpretation", async ({ page }) => {
    await page.goto(route);

    await page.getByRole("combobox", { name: "Brace size" }).selectOption({ label: "Light diagonal" });
    await page.getByRole("slider", { name: "Sideways load" }).fill("46");
    await page.getByRole("slider", { name: "Storey height" }).fill("4.5");

    const observation = page.getByRole("region", { name: "Load path evidence" });
    await expect(observation).toContainText("Brace overstress");
    await expect(observation).toContainText("Brace utilization");
  });

  test("has no critical accessibility violations after reveal", async ({ page }) => {
    await page.goto(route);

    await page.getByRole("radio", { name: predictionOption }).check();
    await page.getByLabel("Rationale").fill("The diagonal brace gives the lateral load a direct path to the base.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    await page.getByRole("region", { name: "Load path evidence" }).waitFor();

    const results = await new AxeBuilder({ page }).analyze();
    const criticalViolations = results.violations.filter(
      (violation) => violation.impact === "critical",
    );

    expect(criticalViolations).toEqual([]);
  });
});
