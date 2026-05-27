import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("Chemical Bonding and Intermolecular Forces", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(
      "/?sim=sutd/10-016-science-for-a-sustainable-world/chemical-bonding-and-intermolecular-forces/chemical-bonding-and-intermolecular-forces",
    );
  });

  test("prediction-gate blocks bonding evidence until commit", async ({ page }) => {
    await expect(page.getByRole("region", { name: "Observation unlocked" })).toHaveCount(0);
    await page.getByRole("button", { name: "Set up bonding comparison" }).click();
    await page.getByRole("button", { name: "Reveal bonding evidence" }).click();

    await expect(page.getByRole("form", { name: "Prediction gate" })).toBeVisible();
    await page.getByRole("radio", { name: "mostly ionic" }).check();
    await page.getByLabel("Rationale").fill("The electronegativity difference is large.");
    await page.getByRole("button", { name: "Commit prediction" }).click();

    const observation = page.getByRole("region", { name: "Observation unlocked" });
    await expect(observation).toContainText("Bonding and intermolecular-force evidence");
    await expect(observation).toContainText("mostly ionic");
    await expect(page.getByLabel("Formula used")).toContainText("Compare electronegativity values");
    await expect(page.getByLabel("Bonding particle diagram")).toBeVisible();
  });

  test("manipulation changes the visible bonding classification", async ({ page }) => {
    await page.getByRole("button", { name: "Set up bonding comparison" }).click();
    await page.getByLabel("Bonding case").selectOption("water");
    await page.getByRole("button", { name: "Reveal bonding evidence" }).click();
    await page.getByRole("radio", { name: "mostly ionic" }).check();
    await page.getByLabel("Rationale").fill("I will compare the selected case after reveal.");
    await page.getByRole("button", { name: "Commit prediction" }).click();

    const observation = page.getByRole("region", { name: "Observation unlocked" });
    await expect(observation).toContainText("H2O");
    await expect(observation).toContainText("polar covalent");
    await expect(observation).toContainText("hydrogen bonding");
  });

  test("has no serious accessibility violations after reveal", async ({ page }) => {
    await page.getByRole("button", { name: "Set up bonding comparison" }).click();
    await page.getByRole("button", { name: "Reveal bonding evidence" }).click();
    await page.getByRole("radio", { name: "mostly ionic" }).check();
    await page.getByLabel("Rationale").fill("A large electronegativity difference supports ionic bonding.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    await page.getByRole("region", { name: "Observation unlocked" }).waitFor();

    const results = await new AxeBuilder({ page }).analyze();
    const seriousOrCritical = results.violations.filter(
      (violation) => violation.impact === "critical" || violation.impact === "serious",
    );
    expect(seriousOrCritical).toEqual([]);
  });
});
