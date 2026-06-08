import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { expectProductSimulationExperience } from "../../../../../../testing/sim-harness/src/playwright-contract.js";

test.describe("Cell Structure and the Membrane", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(
      "/?sim=sutd/10-019-science-and-technology-for-healthcare/cell-structure-and-the-membrane/cell-structure-and-the-membrane",
    );
  });

  test("satisfies the product simulation experience contract", async ({ page }) => {
    await expectProductSimulationExperience(page, {
      simId:
        "sutd/10-019-science-and-technology-for-healthcare/cell-structure-and-the-membrane/cell-structure-and-the-membrane",
      setup: [],
      prediction: {
        optionLabel: "Strongly negative inside, close to the K+ Nernst potential",
        rationale: "K+ permeability dominates, so V_m sits close to E_K.",
      },
      observation: { observationLabel: "Observation" },
    });
  });

  test("prediction-checkpoint keeps resting-voltage evidence visible while saving reflection", async ({ page }) => {
    await expect(page.getByRole("form", { name: "Prediction checkpoint" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Observation" })).toBeVisible();

    await page
      .getByRole("radio", {
        name: "Strongly negative inside, close to the K+ Nernst potential",
      })
      .check();
    await page
      .getByLabel("Rationale")
      .fill("K+ permeability dominates, so V_m sits close to E_K.");
    await page.getByRole("button", { name: "Commit prediction" }).click();

    const observation = page.getByRole("region", { name: "Observation" });
    await expect(observation).toBeVisible();
    await expect(observation).toContainText("Resting voltage from selective permeability");
    await expect(observation).toContainText("E_K");
    await expect(page.getByLabel("LaTeX formula source")).toContainText("V_m");
    await expect(page.getByLabel("Formula legend")).toContainText("relative permeability");
  });

  test("manipulation shifts the voltage toward Na+ Nernst potential", async ({ page }) => {
    await page.getByRole("slider", { name: "K+ relative permeability" }).fill("0.05");
    await page.getByRole("slider", { name: "Na+ relative permeability" }).fill("0.9");
    await page
      .getByRole("radio", {
        name: "Strongly positive inside, close to the Na+ Nernst potential",
      })
      .check();
    await page
      .getByLabel("Rationale")
      .fill("With Na+ permeability raised, V_m moves toward E_Na.");
    await page.getByRole("button", { name: "Commit prediction" }).click();

    const observation = page.getByRole("region", { name: "Observation" });
    await expect(observation).toContainText("Na+ dominant");
  });

  test("has no serious accessibility violations after reveal", async ({ page }) => {
    await page
      .getByRole("radio", {
        name: "Strongly negative inside, close to the K+ Nernst potential",
      })
      .check();
    await page
      .getByLabel("Rationale")
      .fill("K+ permeability dominates.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    await page.getByRole("region", { name: "Observation" }).waitFor();

    const results = await new AxeBuilder({ page }).analyze();
    const seriousOrCritical = results.violations.filter(
      (violation) => violation.impact === "critical" || violation.impact === "serious",
    );

    expect(seriousOrCritical).toEqual([]);
  });
});
