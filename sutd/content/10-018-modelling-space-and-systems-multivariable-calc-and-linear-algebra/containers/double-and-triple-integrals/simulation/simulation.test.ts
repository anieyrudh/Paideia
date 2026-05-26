import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("Double and Triple Integrals", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(
      "/?sim=sutd/10-018-modelling-space-and-systems-multivariable-calc-and-linear-algebra/double-and-triple-integrals/double-and-triple-integrals",
    );
  });

  test("prediction-gate blocks accumulation evidence until commit", async ({ page }) => {
    await expect(page.getByRole("region", { name: "Observation unlocked" })).toHaveCount(0);
    await page.getByRole("button", { name: "Set region" }).click();
    await page.getByRole("button", { name: "Reveal accumulation" }).click();
    await expect(page.getByRole("form", { name: "Prediction gate" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Observation unlocked" })).toHaveCount(0);

    await page.getByRole("radio", { name: "It doubles, because twice as much base area is accumulated" }).check();
    await page.getByLabel("Rationale").fill("With constant density, doubling one rectangular bound doubles the area being accumulated.");
    await page.getByRole("button", { name: "Commit prediction" }).click();

    await expect(page.getByRole("region", { name: "Observation unlocked" })).toContainText("Accumulation evidence");
    await expect(page.getByRole("region", { name: "Formula panel" })).toContainText("Substitution");
  });

  test("manipulating the mode changes visible integral evidence", async ({ page }) => {
    await page.getByRole("button", { name: "Set region" }).click();
    await page.getByRole("combobox", { name: "Integral mode" }).selectOption({ label: "Triple integral as stacked layers" });
    await page.getByRole("button", { name: "Reveal accumulation" }).click();
    await page.getByRole("radio", { name: "It doubles, because twice as much base area is accumulated" }).check();
    await page.getByLabel("Rationale").fill("The triple integral stacks the base accumulation through height.");
    await page.getByRole("button", { name: "Commit prediction" }).click();

    const observation = page.getByRole("region", { name: "Observation unlocked" });
    await expect(observation).toContainText("Triple integral");
    await expect(observation).toContainText("layer model");
  });

  test("formula, legend, substituted values, units, and interpretation are visible", async ({ page }) => {
    await page.getByRole("button", { name: "Set region" }).click();
    await page.getByRole("button", { name: "Reveal accumulation" }).click();
    await page.getByRole("radio", { name: "It doubles, because twice as much base area is accumulated" }).check();
    await page.getByLabel("Rationale").fill("The area doubles when one bound doubles.");
    await page.getByRole("button", { name: "Commit prediction" }).click();

    const panel = page.getByRole("region", { name: "Formula panel" });
    await expect(panel).toContainText("iint");
    await expect(panel).toContainText("Legend:");
    await expect(panel).toContainText("Substitution:");
    await expect(panel).toContainText("m");
    await expect(panel).toContainText("Interpretation:");
  });

  test("has no serious or critical accessibility violations after reveal", async ({ page }) => {
    await page.getByRole("button", { name: "Set region" }).click();
    await page.getByRole("button", { name: "Reveal accumulation" }).click();
    await page.getByRole("radio", { name: "It doubles, because twice as much base area is accumulated" }).check();
    await page.getByLabel("Rationale").fill("The integral accumulates density over the base area.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    await page.getByRole("region", { name: "Observation unlocked" }).waitFor();

    const results = await new AxeBuilder({ page }).analyze();
    const highImpactViolations = results.violations.filter(
      (violation) => violation.impact === "critical" || violation.impact === "serious",
    );
    expect(highImpactViolations).toEqual([]);
  });
});
