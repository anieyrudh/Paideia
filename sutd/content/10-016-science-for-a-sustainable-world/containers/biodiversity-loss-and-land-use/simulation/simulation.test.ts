import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("Biodiversity Loss and Land Use", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(
      "/?sim=sutd/10-016-science-for-a-sustainable-world/biodiversity-loss-and-land-use/biodiversity-loss-and-land-use",
    );
  });

  test("prediction-checkpoint keeps biodiversity evidence visible while saving reflection", async ({ page }) => {
    {
      const setupButton = page.getByRole("button", { name: "Set up land-use scenario" });
      if ((await setupButton.count()) > 0) {
        await setupButton.first().click();
      }
    }
    await page.getByRole("button", { name: "Reveal biodiversity evidence" }).click();
    await expect(page.getByRole("form", { name: "Prediction checkpoint" })).toBeVisible();

    await page
      .getByRole("radio", {
        name: "Small annual land-use changes can compound into large habitat and species losses",
      })
      .check();
    await page.getByLabel("Rationale").fill("Compounding rates and sensitivity make the loss nonlinear.");
    await page.getByRole("button", { name: "Commit prediction" }).click();

    const observation = page.getByRole("region", { name: "Observation unlocked" });
    await expect(observation).toBeVisible();
    await expect(observation).toContainText("Biodiversity evidence");
    await expect(page.getByLabel("LaTeX formula source")).toContainText("B = 100");
    await expect(page.getByLabel("Formula legend")).toContainText("species sensitivity");
  });

  test("manipulation increases the risk readout", async ({ page }) => {
    {
      const setupButton = page.getByRole("button", { name: "Set up land-use scenario" });
      if ((await setupButton.count()) > 0) {
        await setupButton.first().click();
      }
    }
    await page.getByRole("slider", { name: "Land-use conversion" }).fill("6");
    await page.getByRole("slider", { name: "Restoration" }).fill("0");
    await page.getByRole("button", { name: "Reveal biodiversity evidence" }).click();
    await page
      .getByRole("radio", {
        name: "Small annual land-use changes can compound into large habitat and species losses",
      })
      .check();
    await page.getByLabel("Rationale").fill("High conversion compounds over time.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    await expect(page.getByRole("region", { name: "Observation unlocked" })).toContainText("high");
  });

  test("has no serious accessibility violations after reveal", async ({ page }) => {
    {
      const setupButton = page.getByRole("button", { name: "Set up land-use scenario" });
      if ((await setupButton.count()) > 0) {
        await setupButton.first().click();
      }
    }
    await page.getByRole("button", { name: "Reveal biodiversity evidence" }).click();
    await page
      .getByRole("radio", {
        name: "Small annual land-use changes can compound into large habitat and species losses",
      })
      .check();
    await page.getByLabel("Rationale").fill("Rates compound across years.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    await page.getByRole("region", { name: "Observation unlocked" }).waitFor();

    const results = await new AxeBuilder({ page }).analyze();
    const seriousOrCritical = results.violations.filter(
      (violation) => violation.impact === "critical" || violation.impact === "serious",
    );
    expect(seriousOrCritical).toEqual([]);
  });
});
