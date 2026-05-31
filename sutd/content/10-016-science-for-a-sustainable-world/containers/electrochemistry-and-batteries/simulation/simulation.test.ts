import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("Electrochemistry and Batteries", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(
      "/?sim=sutd/10-016-science-for-a-sustainable-world/electrochemistry-and-batteries/electrochemistry-and-batteries",
    );
  });

  test("prediction-checkpoint keeps battery voltage visible while saving reflection", async ({ page }) => {
    {
      const setupButton = page.getByRole("button", { name: "Set up battery cell" });
      if ((await setupButton.count()) > 0) {
        await setupButton.first().click();
      }
    }
    await page.getByRole("button", { name: "Reveal battery voltage" }).click();
    await expect(page.getByRole("form", { name: "Prediction checkpoint" })).toBeVisible();
    await page.getByRole("radio", { name: "Voltage decreases" }).check();
    await page.getByLabel("Rationale").fill("Product build-up increases Q, reducing voltage.");
    await page.getByRole("button", { name: "Commit prediction" }).click();

    const observation = page.getByRole("region", { name: "Observation unlocked" });
    await expect(observation).toContainText("Nernst voltage and battery state");
    await expect(observation).toContainText("1.10 V");
    await expect(page.getByLabel("Formula used")).toContainText("Apply the Nernst equation");
  });

  test("reaction quotient manipulation lowers voltage", async ({ page }) => {
    {
      const setupButton = page.getByRole("button", { name: "Set up battery cell" });
      if ((await setupButton.count()) > 0) {
        await setupButton.first().click();
      }
    }
    await page.getByRole("slider", { name: "Reaction quotient" }).fill("20");
    await page.getByRole("button", { name: "Reveal battery voltage" }).click();
    await page.getByRole("radio", { name: "Voltage decreases" }).check();
    await page.getByLabel("Rationale").fill("High Q should subtract a larger Nernst term.");
    await page.getByRole("button", { name: "Commit prediction" }).click();

    const observation = page.getByRole("region", { name: "Observation unlocked" });
    await expect(observation).toContainText("1.06 V");
    await expect(observation).toContainText("0.04 V from standard");
  });

  test("has no serious accessibility violations after reveal", async ({ page }) => {
    {
      const setupButton = page.getByRole("button", { name: "Set up battery cell" });
      if ((await setupButton.count()) > 0) {
        await setupButton.first().click();
      }
    }
    await page.getByRole("button", { name: "Reveal battery voltage" }).click();
    await page.getByRole("radio", { name: "Voltage decreases" }).check();
    await page.getByLabel("Rationale").fill("A larger reaction quotient lowers a galvanic cell potential.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    await page.getByRole("region", { name: "Observation unlocked" }).waitFor();

    const results = await new AxeBuilder({ page }).analyze();
    const seriousOrCritical = results.violations.filter(
      (violation) => violation.impact === "critical" || violation.impact === "serious",
    );
    expect(seriousOrCritical).toEqual([]);
  });
});
