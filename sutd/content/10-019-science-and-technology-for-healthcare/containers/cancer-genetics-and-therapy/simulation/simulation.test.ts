import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { expectProductSimulationExperience } from "../../../../../../testing/sim-harness/src/playwright-contract.js";

test.describe("Cancer Genetics and Therapy", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(
      "/?sim=sutd/10-019-science-and-technology-for-healthcare/cancer-genetics-and-therapy/cancer-genetics-and-therapy",
    );
  });

  test("satisfies the product simulation experience contract", async ({ page }) => {
    await expectProductSimulationExperience(page, {
      simId:
        "sutd/10-019-science-and-technology-for-healthcare/cancer-genetics-and-therapy/cancer-genetics-and-therapy",
      setup: [],
      prediction: {
        optionLabel: "About 304x baseline, so about 3045 cells from a starting size of 10.",
        rationale: "Fitness compounds per generation; ((1.1)^3)^20 is about 304x baseline.",
      },
      observation: { observationLabel: "Observation" },
    });
  });

  test("prediction-checkpoint keeps clonal-growth + dose-response evidence visible while saving reflection", async ({ page }) => {
    await expect(page.getByRole("form", { name: "Prediction checkpoint" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Observation" })).toBeVisible();

    await page
      .getByRole("radio", {
        name: "About 304x baseline, so about 3045 cells from a starting size of 10.",
      })
      .check();
    await page
      .getByLabel("Rationale")
      .fill("Fitness compounds per generation; ((1.1)^3)^20 is about 304x baseline.");
    await page.getByRole("button", { name: "Commit prediction" }).click();

    const observation = page.getByRole("region", { name: "Observation" });
    await expect(observation).toBeVisible();
    await expect(observation).toContainText("clonal");
    await expect(observation).toContainText("dose");
    await expect(page.getByLabel("LaTeX formula source")).toContainText("1+s");
    await expect(page.getByLabel("Formula legend")).toContainText("IC50");
    await page.getByRole("button", { name: "Explain resistance shift" }).click();
    await expect(page.getByRole("heading", { name: "Resistance shifts the IC50" })).toBeVisible();
  });

  test("raising resistance factor pushes the required dose up", async ({ page }) => {
    await page.getByRole("slider", { name: "Resistance factor" }).fill("4");
    await page
      .getByRole("radio", {
        name: "About 304x baseline, so about 3045 cells from a starting size of 10.",
      })
      .check();
    await page.getByLabel("Rationale").fill("Resistance multiplies effective IC50.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    const observation = page.getByRole("region", { name: "Observation" });
    await expect(observation).toContainText("effective IC50");
  });

  test("has no serious accessibility violations in observation", async ({ page }) => {
    await page
      .getByRole("radio", {
        name: "About 304x baseline, so about 3045 cells from a starting size of 10.",
      })
      .check();
    await page.getByLabel("Rationale").fill("Drivers compound fitness.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    await page.getByRole("region", { name: "Observation" }).waitFor();
    const results = await new AxeBuilder({ page }).analyze();
    const seriousOrCritical = results.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious",
    );
    expect(seriousOrCritical).toEqual([]);
  });
});
