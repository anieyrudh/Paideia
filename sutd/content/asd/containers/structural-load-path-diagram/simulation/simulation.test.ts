import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("Structural Load Path Diagram", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/?sim=sutd/asd/structural-load-path-diagram/structural-load-path-diagram");
  });

  test("prediction-gate blocks load path evidence until commit", async ({ page }) => {
    await expect(page.getByRole("region", { name: "Load path evidence" })).toHaveCount(0);

    await page.getByRole("button", { name: "Set bay inputs" }).click();
    await page.getByRole("button", { name: "Reveal load path" }).click();

    await expect(page.getByRole("form", { name: "Prediction gate" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Load path evidence" })).toHaveCount(0);

    await page.getByRole("radio", { name: "The diagonal brace force, because it resolves the sideways load." }).check();
    await page
      .getByLabel("Rationale")
      .fill("The diagonal must provide the horizontal component that balances the sideways load.");
    await page.getByRole("button", { name: "Commit prediction" }).click();

    const observation = page.getByRole("region", { name: "Load path evidence" });
    await expect(observation).toBeVisible();
    await expect(observation).toContainText("Structural load path evidence");
    await expect(observation).toContainText("Formula trail");
    await expect(observation).toContainText("Substitution: F_b");
  });

  test("manipulation changes the brace demand and revealed interpretation", async ({ page }) => {
    await page.getByRole("button", { name: "Set bay inputs" }).click();
    await page.getByRole("combobox", { name: "Brace size" }).selectOption({ label: "Light diagonal" });
    await page.getByRole("slider", { name: "Sideways load" }).fill("46");
    await page.getByRole("slider", { name: "Storey height" }).fill("4.5");
    await page.getByRole("button", { name: "Reveal load path" }).click();

    await page.getByRole("radio", { name: "The diagonal brace force, because it resolves the sideways load." }).check();
    await page.getByLabel("Rationale").fill("The light diagonal should govern when the lateral load is high.");
    await page.getByRole("button", { name: "Commit prediction" }).click();

    const observation = page.getByRole("region", { name: "Load path evidence" });
    await expect(observation).toContainText("Brace overstress");
    await expect(observation).toContainText("Brace utilization");
  });

  test("has no critical accessibility violations after reveal", async ({ page }) => {
    await page.getByRole("button", { name: "Set bay inputs" }).click();
    await page.getByRole("button", { name: "Reveal load path" }).click();
    await page.getByRole("radio", { name: "The diagonal brace force, because it resolves the sideways load." }).check();
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
