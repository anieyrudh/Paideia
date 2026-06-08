import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("Polymers and Plastic Waste Management", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(
      "/?sim=sutd/10-016-science-for-a-sustainable-world/polymers-and-plastic-waste-management/polymers-and-plastic-waste-management",
    );
  });

  test("prediction-checkpoint keeps polymer evidence visible while saving reflection", async ({ page }) => {
    {
      const setupButton = page.getByRole("button", { name: "Set up polymer scenario" });
      if ((await setupButton.count()) > 0) {
        await setupButton.first().click();
      }
    }
    await page.getByRole("button", { name: "Reveal polymer trade-off" }).click();

    await expect(page.getByRole("form", { name: "Prediction checkpoint" })).toBeVisible();
    await page.getByRole("radio", { name: "Strength, density, embodied carbon, and collection pathway" }).check();
    await page.getByLabel("Rationale").fill("The polymer and the waste system both matter.");
    await page.getByRole("button", { name: "Commit prediction" }).click();

    const observation = page.getByRole("region", { name: "Observation unlocked" });
    await expect(observation).toContainText("Polymer choice plus recovery pathway");
    await expect(page.getByLabel("Formula used")).toContainText("Score the material and the system");
    await expect(page.getByLabel("Polymer ranking chart")).toBeVisible();
  });

  test("manipulation changes collection and reuse evidence", async ({ page }) => {
    {
      const setupButton = page.getByRole("button", { name: "Set up polymer scenario" });
      if ((await setupButton.count()) > 0) {
        await setupButton.first().click();
      }
    }
    await page.getByRole("slider", { name: "Collected for recovery" }).fill("20");
    await page.getByRole("slider", { name: "Reuse cycles" }).fill("10");
    await page.getByRole("button", { name: "Reveal polymer trade-off" }).click();
    await page.getByRole("radio", { name: "Strength, density, embodied carbon, and collection pathway" }).check();
    await page.getByLabel("Rationale").fill("I expect unrecovered waste to remain high when collection is low.");
    await page.getByRole("button", { name: "Commit prediction" }).click();

    const observation = page.getByRole("region", { name: "Observation unlocked" });
    await expect(observation).toContainText("80 out of 100");
    await expect(observation).toContainText("90 per 100 services");
  });

  test("has no serious accessibility violations after reveal", async ({ page }) => {
    {
      const setupButton = page.getByRole("button", { name: "Set up polymer scenario" });
      if ((await setupButton.count()) > 0) {
        await setupButton.first().click();
      }
    }
    await page.getByRole("button", { name: "Reveal polymer trade-off" }).click();
    await page.getByRole("radio", { name: "Strength, density, embodied carbon, and collection pathway" }).check();
    await page.getByLabel("Rationale").fill("A sustainable polymer choice needs material and end-of-life evidence.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    await page.getByRole("region", { name: "Observation unlocked" }).waitFor();

    const results = await new AxeBuilder({ page }).analyze();
    const seriousOrCritical = results.violations.filter(
      (violation) => violation.impact === "critical" || violation.impact === "serious",
    );
    expect(seriousOrCritical).toEqual([]);
  });
});
