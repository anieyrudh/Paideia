import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("Gradient Descent Landscape", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/?sim=shared/cs/gradient-descent-landscape/loss-surface-stepper");
  });

  test("prediction-gate blocks gradient trace reveal until commit", async ({ page }) => {
    await expect(page.getByLabel("Observation unlocked")).toHaveCount(0);
    await expect(page.getByRole("form", { name: "Prediction gate" })).toBeVisible();
    await expect(page.getByText("Formula used")).toHaveCount(0);

    await page.getByRole("radio", { name: "The path can overshoot and zig-zag across the valley" }).check();
    await page.getByLabel("Rationale").fill("A larger step can jump across a steep valley.");
    await page.getByRole("button", { name: "Commit prediction" }).click();

    await expect(page.getByLabel("Observation unlocked")).toBeVisible();
    await expect(page.getByLabel("Loss surface and descent trace")).toBeVisible();
    await expect(page.getByText("Formula used")).toBeVisible();
  });

  test("main controls change the visible trace state", async ({ page }) => {
    await page.getByRole("radio", { name: "The path can overshoot and zig-zag across the valley" }).check();
    await page.getByLabel("Rationale").fill("Steep ravines make large eta unstable.");
    await page.getByRole("button", { name: "Commit prediction" }).click();

    await expect(page.getByLabel("Observation unlocked")).toContainText("loss units");
    await page.getByRole("button", { name: "overshoot" }).click();
    await expect(page.getByLabel("Observation unlocked")).toContainText("unstable");
  });

  test("has no serious accessibility violations after reveal", async ({ page }) => {
    await page.getByRole("radio", { name: "The path can overshoot and zig-zag across the valley" }).check();
    await page.getByLabel("Rationale").fill("The update can overshoot when eta is too large.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    await page.getByLabel("Observation unlocked").waitFor();

    const results = await new AxeBuilder({ page }).analyze();
    const seriousOrCritical = results.violations.filter(
      (violation) => violation.impact === "critical" || violation.impact === "serious",
    );

    expect(seriousOrCritical).toEqual([]);
  });

  test("shows formula, legend, substitution, units, and interpretation", async ({ page }) => {
    await page.getByRole("radio", { name: "The path can overshoot and zig-zag across the valley" }).check();
    await page.getByLabel("Rationale").fill("Learning rate scales the gradient step.");
    await page.getByRole("button", { name: "Commit prediction" }).click();

    await expect(page.getByLabel("Formula used")).toContainText("thetak+1");
    await expect(page.getByLabel("Formula legend")).toContainText("learning rate");
    await expect(page.getByLabel("Formula used")).toContainText("Substitute first step");
    await expect(page.getByLabel("Formula used")).toContainText("parameter units");
    await expect(page.getByLabel("Formula used")).toContainText("The rule applies because");
  });
});
