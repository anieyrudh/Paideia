import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const route =
  "/?sim=sutd/40-012-manufacturing-and-service-operations-mso/scheduling-and-project-management/schedule-critical-path-lab";

test.describe("Scheduling and Project Management", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(route);
  });

  test("prediction-gate blocks CPM evidence until commit", async ({ page }) => {
    await expect(page.getByRole("region", { name: "Observation unlocked" })).toHaveCount(0);
    await page.getByRole("spinbutton", { name: "Prediction" }).fill("18");
    await page.getByLabel("Rationale").fill("The procurement and tooling path controls launch.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    await expect(page.getByRole("button", { name: "Build schedule" })).toBeVisible();
    await page.getByRole("button", { name: "Build schedule" }).click();
    await expect(page.getByRole("region", { name: "Observation unlocked" })).toHaveCount(0);
    await page.getByRole("button", { name: "Reveal CPM" }).click();
    await expect(page.getByRole("region", { name: "Observation unlocked" })).toBeVisible();
  });

  test("manipulation changes the visible critical path", async ({ page }) => {
    await page.getByRole("spinbutton", { name: "Prediction" }).fill("18");
    await page.getByLabel("Rationale").fill("Baseline tooling path controls launch.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    await page.getByRole("button", { name: "Build schedule" }).click();
    await page.getByLabel("Prototype duration").fill("9");
    await page.getByLabel("Training duration").fill("8");
    await page.getByRole("button", { name: "Reveal CPM" }).click();
    await expect(
      page.getByText("A Requirements -> C Prototype -> F Training -> G Launch", { exact: true }).first(),
    ).toBeVisible();
    await expect(page.getByText("22 d", { exact: true }).first()).toBeVisible();
  });

  test("has no serious accessibility violations after reveal", async ({ page }) => {
    await page.getByRole("spinbutton", { name: "Prediction" }).fill("18");
    await page.getByLabel("Rationale").fill("Baseline tooling path controls launch.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    await page.getByRole("button", { name: "Build schedule" }).click();
    await page.getByRole("button", { name: "Reveal CPM" }).click();
    const results = await new AxeBuilder({ page }).analyze();
    const violations = results.violations.filter(
      (violation) => violation.impact === "serious" || violation.impact === "critical",
    );
    expect(violations).toEqual([]);
  });
});
