import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("Thermochemistry and Equilibrium", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(
      "/?sim=sutd/10-016-science-for-a-sustainable-world/thermochemistry-and-equilibrium/thermochemistry-and-equilibrium",
    );
  });

  test("prediction-checkpoint keeps energy and equilibrium evidence visible while saving reflection", async ({ page }) => {
    {
      const setupButton = page.getByRole("button", { name: "Set up reaction system" });
      if ((await setupButton.count()) > 0) {
        await setupButton.first().click();
      }
    }
    await page.getByRole("button", { name: "Reveal energy and equilibrium" }).click();

    await expect(page.getByRole("form", { name: "Prediction checkpoint" })).toBeVisible();
    await page.getByRole("radio", { name: "absorbed by the sample" }).check();
    await page.getByLabel("Rationale").fill("The water temperature increases, so heat enters the sample.");
    await page.getByRole("button", { name: "Commit prediction" }).click();

    const observation = page.getByRole("region", { name: "Observation unlocked" });
    await expect(observation).toContainText("Energy and equilibrium evidence");
    await expect(observation).toContainText("8.4 kJ");
    await expect(page.getByLabel("Formula used")).toContainText("Connect heat and composition");
    await expect(page.getByLabel("Thermochemistry equilibrium diagram")).toBeVisible();
  });

  test("manipulation changes heat direction and equilibrium quotient", async ({ page }) => {
    {
      const setupButton = page.getByRole("button", { name: "Set up reaction system" });
      if ((await setupButton.count()) > 0) {
        await setupButton.first().click();
      }
    }
    await page.getByRole("slider", { name: "Final temperature" }).fill("22");
    await page.getByRole("slider", { name: "Product concentration" }).fill("0.3");
    await page.getByRole("slider", { name: "Reactant concentration" }).fill("1.5");
    await page.getByRole("button", { name: "Reveal energy and equilibrium" }).click();
    await page.getByRole("radio", { name: "absorbed by the sample" }).check();
    await page.getByLabel("Rationale").fill("I will compare the adjusted state after reveal.");
    await page.getByRole("button", { name: "Commit prediction" }).click();

    const observation = page.getByRole("region", { name: "Observation unlocked" });
    await expect(observation).toContainText("cooling");
    await expect(observation).toContainText("0.20");
    await expect(observation).toContainText("reactant-favoured");
  });

  test("has no serious accessibility violations after reveal", async ({ page }) => {
    {
      const setupButton = page.getByRole("button", { name: "Set up reaction system" });
      if ((await setupButton.count()) > 0) {
        await setupButton.first().click();
      }
    }
    await page.getByRole("button", { name: "Reveal energy and equilibrium" }).click();
    await page.getByRole("radio", { name: "absorbed by the sample" }).check();
    await page.getByLabel("Rationale").fill("A warmer water sample has absorbed heat.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    await page.getByRole("region", { name: "Observation unlocked" }).waitFor();

    const results = await new AxeBuilder({ page }).analyze();
    const seriousOrCritical = results.violations.filter(
      (violation) => violation.impact === "critical" || violation.impact === "serious",
    );
    expect(seriousOrCritical).toEqual([]);
  });
});
