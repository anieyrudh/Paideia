import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("Atomic Structure and Electron Configuration", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(
      "/?sim=sutd/10-016-science-for-a-sustainable-world/atomic-structure-and-electron-configuration/atomic-structure-and-electron-configuration",
    );
  });

  test("prediction-checkpoint keeps electron configuration visible while saving reflection", async ({ page }) => {

    {

      const setupButton = page.getByRole("button", { name: "Set up atom model" });

      if ((await setupButton.count()) > 0) {

        await setupButton.first().click();

      }

    }
    await page.getByRole("button", { name: "Reveal electron arrangement" }).click();

    await expect(page.getByRole("form", { name: "Prediction checkpoint" })).toBeVisible();

    await page.getByRole("radio", { name: "2, 4" }).check();
    await page.getByLabel("Rationale").fill("Carbon has six electrons: two in shell 1 and four in shell 2.");
    await page.getByRole("button", { name: "Commit prediction" }).click();

    const observation = page.getByRole("region", { name: "Observation unlocked" });
    await expect(observation).toBeVisible();
    await expect(observation).toContainText("Electron configuration evidence");
    await expect(observation).toContainText("1s2 2s2 2p2");
    await expect(page.getByLabel("Electron shell diagram")).toBeVisible();
    await expect(page.getByLabel("Formula used")).toContainText("Neutral atoms match protons and electrons");
  });

  test("manipulation changes visible shell and valence evidence", async ({ page }) => {
    {
      const setupButton = page.getByRole("button", { name: "Set up atom model" });
      if ((await setupButton.count()) > 0) {
        await setupButton.first().click();
      }
    }
    await page.getByRole("slider", { name: "Atomic number Z" }).fill("17");
    await page.getByRole("button", { name: "Reveal electron arrangement" }).click();
    await page.getByRole("radio", { name: "2, 4" }).check();
    await page.getByLabel("Rationale").fill("I will compare carbon's prediction with chlorine after reveal.");
    await page.getByRole("button", { name: "Commit prediction" }).click();

    const observation = page.getByRole("region", { name: "Observation unlocked" });
    await expect(observation).toContainText("chlorine");
    await expect(observation).toContainText("1s2 2s2 2p6 3s2 3p5");
    await expect(observation).toContainText("Valence electrons");
    await expect(observation).toContainText("7");
  });

  test("has no serious accessibility violations after reveal", async ({ page }) => {
    {
      const setupButton = page.getByRole("button", { name: "Set up atom model" });
      if ((await setupButton.count()) > 0) {
        await setupButton.first().click();
      }
    }
    await page.getByRole("button", { name: "Reveal electron arrangement" }).click();
    await page.getByRole("radio", { name: "2, 4" }).check();
    await page.getByLabel("Rationale").fill("The first shell holds two electrons and carbon has four left.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    await page.getByRole("region", { name: "Observation unlocked" }).waitFor();

    const results = await new AxeBuilder({ page }).analyze();
    const seriousOrCritical = results.violations.filter(
      (violation) => violation.impact === "critical" || violation.impact === "serious",
    );

    expect(seriousOrCritical).toEqual([]);
  });
});
