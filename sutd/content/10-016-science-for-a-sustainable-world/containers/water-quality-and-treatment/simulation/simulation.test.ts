import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("Water Quality and Treatment", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(
      "/?sim=sutd/10-016-science-for-a-sustainable-world/water-quality-and-treatment/water-quality-and-treatment",
    );
  });

  test("prediction-checkpoint keeps treatment evidence visible while saving reflection", async ({ page }) => {

    {

      const setupButton = page.getByRole("button", { name: "Set up treatment check" });

      if ((await setupButton.count()) > 0) {

        await setupButton.first().click();

      }

    }
    await page.getByRole("button", { name: "Reveal treatment evidence" }).click();

    await expect(page.getByRole("form", { name: "Prediction checkpoint" })).toBeVisible();

    await page
      .getByRole("radio", {
        name: "Low turbidity helps, but pathogen risk still needs disinfection evidence",
      })
      .check();
    await page.getByLabel("Rationale").fill("Clear water can still need CT evidence.");
    await page.getByRole("button", { name: "Commit prediction" }).click();

    const observation = page.getByRole("region", { name: "Observation unlocked" });
    await expect(observation).toBeVisible();
    await expect(observation).toContainText("Treatment evidence");
    await expect(observation).toContainText("Finished turbidity");
    await expect(page.getByLabel("LaTeX formula source")).toContainText("CT");
    await expect(page.getByLabel("Formula legend")).toContainText("contact time");
  });

  test("manipulation exposes a disinfection blocker", async ({ page }) => {
    {
      const setupButton = page.getByRole("button", { name: "Set up treatment check" });
      if ((await setupButton.count()) > 0) {
        await setupButton.first().click();
      }
    }
    await page.getByRole("slider", { name: "Free chlorine dose" }).fill("0.2");
    await page.getByRole("slider", { name: "Contact time" }).fill("5");
    await page.getByRole("button", { name: "Reveal treatment evidence" }).click();
    await page
      .getByRole("radio", {
        name: "Low turbidity helps, but pathogen risk still needs disinfection evidence",
      })
      .check();
    await page.getByLabel("Rationale").fill("Low CT leaves too much microbial risk.");
    await page.getByRole("button", { name: "Commit prediction" }).click();

    await expect(page.getByRole("region", { name: "Observation unlocked" })).toContainText(
      "needs adjustment",
    );
  });

  test("has no serious accessibility violations after reveal", async ({ page }) => {
    {
      const setupButton = page.getByRole("button", { name: "Set up treatment check" });
      if ((await setupButton.count()) > 0) {
        await setupButton.first().click();
      }
    }
    await page.getByRole("button", { name: "Reveal treatment evidence" }).click();
    await page
      .getByRole("radio", {
        name: "Low turbidity helps, but pathogen risk still needs disinfection evidence",
      })
      .check();
    await page.getByLabel("Rationale").fill("Treatment needs invisible chemistry evidence too.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    await page.getByRole("region", { name: "Observation unlocked" }).waitFor();

    const results = await new AxeBuilder({ page }).analyze();
    const seriousOrCritical = results.violations.filter(
      (violation) => violation.impact === "critical" || violation.impact === "serious",
    );

    expect(seriousOrCritical).toEqual([]);
  });
});
