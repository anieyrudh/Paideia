import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("Newsvendor Critical Fractile", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => window.localStorage.clear());
    await page.goto("/?sim=sutd/esd/newsvendor-critical-fractile/newsvendor-critical-fractile");
  });

  test("prediction-checkpoint keeps the stocking rule visible while saving reflection", async ({ page }) => {
    {
      const setupButton = page.getByRole("button", { name: "Set inventory scenario" });
      if ((await setupButton.count()) > 0) {
        await setupButton.first().click();
      }
    }
    await expect(
      page.getByRole("table", { name: "Demand distribution with cumulative probability" }),
    ).toContainText("Cumulative");
    await page.getByRole("button", { name: "Reveal stocking rule" }).click();

    await expect(page.getByRole("form", { name: "Prediction checkpoint" })).toBeVisible();

    await page.getByRole("radio", { name: "Above the mean-demand point" }).check();
    await page
      .getByLabel("Rationale")
      .fill("High shortage cost raises the target service level above the mean-demand point.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    await expect(page.getByLabel("Formula evidence")).toContainText("CR = C_under");
    await expect(page.getByLabel("Formula legend")).toContainText("C_under");
    await expect(page.getByText("Rule order")).toBeVisible();
  });

  test("manipulation changes the visible recommendation", async ({ page }) => {
    {
      const setupButton = page.getByRole("button", { name: "Set inventory scenario" });
      if ((await setupButton.count()) > 0) {
        await setupButton.first().click();
      }
    }
    await page.getByRole("button", { name: "launch stockout risk" }).click();
    await page.getByRole("button", { name: "Reveal stocking rule" }).click();
    await page.getByRole("radio", { name: "Above the mean-demand point" }).check();
    await page
      .getByLabel("Rationale")
      .fill("Launch stockouts are costly, so I expect a higher service target.");
    await page.getByRole("button", { name: "Commit prediction" }).click();

    await expect(page.getByRole("region", { name: "Observation unlocked" })).toContainText(
      "130 units",
    );
    await expect(page.getByRole("region", { name: "Observation unlocked" })).toContainText(
      "83.9%",
    );
  });

  test("formula, legend, substitution, units, and interpretation are shown together", async ({
    page,
  }) => {
    {
      const setupButton = page.getByRole("button", { name: "Set inventory scenario" });
      if ((await setupButton.count()) > 0) {
        await setupButton.first().click();
      }
    }
    await page.getByRole("button", { name: "Reveal stocking rule" }).click();
    await page.getByRole("radio", { name: "Above the mean-demand point" }).check();
    await page.getByLabel("Rationale").fill("I will compare shortage and leftover costs.");
    await page.getByRole("button", { name: "Commit prediction" }).click();

    await expect(page.getByLabel("Formula used")).toContainText("choose the smallest Q");
    await expect(page.getByLabel("Formula legend")).toContainText("F(Q)");
    await expect(page.getByLabel("Formula evidence")).toContainText("SGD/unit");
    await expect(page.getByLabel("Formula evidence")).toContainText("Substitution");
    await expect(page.getByLabel("Formula evidence")).toContainText("Interpretation");
    await expect(page.getByLabel("Expected cost curve")).toContainText(
      "Expected cost by trial order",
    );

    await page.setViewportSize({ width: 390, height: 780 });
    const overflowing = await page
      .getByLabel("Formula evidence")
      .evaluate((element) => element.scrollWidth > element.clientWidth + 1);
    expect(overflowing).toBe(false);
  });

  test("has no serious or critical accessibility violations after reveal", async ({ page }) => {
    {
      const setupButton = page.getByRole("button", { name: "Set inventory scenario" });
      if ((await setupButton.count()) > 0) {
        await setupButton.first().click();
      }
    }
    await page.getByRole("button", { name: "Reveal stocking rule" }).click();
    await page.getByRole("radio", { name: "Above the mean-demand point" }).check();
    await page
      .getByLabel("Rationale")
      .fill("The ratio should move the target toward expensive shortage protection.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    await page.getByRole("region", { name: "Observation unlocked" }).waitFor();

    const results = await new AxeBuilder({ page }).analyze();
    const seriousOrCritical = results.violations.filter(
      (violation) => violation.impact === "critical" || violation.impact === "serious",
    );
    expect(seriousOrCritical).toEqual([]);
  });
});
