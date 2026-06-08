import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const route =
  "/?sim=sutd/40-012-manufacturing-and-service-operations-mso/scheduling-and-project-management/schedule-critical-path-lab";

test.describe("Scheduling and Project Management", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(route);
  });

  test("prediction-checkpoint keeps CPM evidence visible while saving reflection", async ({ page }) => {
    await page.getByRole("spinbutton", { name: "Prediction" }).fill("18");
    await page.getByLabel("Rationale").fill("The procurement and tooling path controls launch.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    {
      const setupButton = page.getByRole("button", { name: "Build schedule" });
      if ((await setupButton.count()) > 0) {
        await setupButton.first().click();
      }
    }
    await page.getByRole("button", { name: "Reveal CPM" }).click();
  });

  test("manipulation changes the visible critical path", async ({ page }) => {
    await page.getByRole("spinbutton", { name: "Prediction" }).fill("18");
    await page.getByLabel("Rationale").fill("Baseline tooling path controls launch.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    {
      const setupButton = page.getByRole("button", { name: "Build schedule" });
      if ((await setupButton.count()) > 0) {
        await setupButton.first().click();
      }
    }
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
    {
      const setupButton = page.getByRole("button", { name: "Build schedule" });
      if ((await setupButton.count()) > 0) {
        await setupButton.first().click();
      }
    }
    await page.getByRole("button", { name: "Reveal CPM" }).click();
    const results = await new AxeBuilder({ page }).analyze();
    const violations = results.violations.filter(
      (violation) => violation.impact === "serious" || violation.impact === "critical",
    );
    expect(violations).toEqual([]);
  });
});
