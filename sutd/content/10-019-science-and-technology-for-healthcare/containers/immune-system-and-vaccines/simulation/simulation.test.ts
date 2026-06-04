import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { expectProductSimulationExperience } from "../../../../../../testing/sim-harness/src/playwright-contract.js";

test.describe("Immune System and Vaccines", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(
      "/?sim=sutd/10-019-science-and-technology-for-healthcare/immune-system-and-vaccines/immune-system-and-vaccines",
    );
  });

  test("satisfies the product simulation experience contract", async ({ page }) => {
    await expectProductSimulationExperience(page, {
      simId:
        "sutd/10-019-science-and-technology-for-healthcare/immune-system-and-vaccines/immune-system-and-vaccines",
      setup: [],
      prediction: {
        optionLabel:
          "Re = 1.6, outbreak still grows because Re > 1 and the herd-immunity threshold is 75 percent.",
        rationale: "Re = R0 (1 - p) = 4 * 0.4 = 1.6; threshold is 1 - 1/4 = 0.75.",
      },
      observation: { observationLabel: "Observation" },
    });
  });

  test("prediction-checkpoint keeps Re evidence visible while saving reflection", async ({ page }) => {
    await expect(page.getByRole("form", { name: "Prediction checkpoint" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Observation" })).toBeVisible();

    await page
      .getByRole("radio", {
        name: "Re = 1.6, outbreak still grows because Re > 1 and the herd-immunity threshold is 75 percent.",
      })
      .check();
    await page
      .getByLabel("Rationale")
      .fill("Re = R0 (1 - p) = 4 * 0.4 = 1.6; threshold is 1 - 1/4 = 0.75.");
    await page.getByRole("button", { name: "Commit prediction" }).click();

    const observation = page.getByRole("region", { name: "Observation" });
    await expect(observation).toBeVisible();
    await expect(observation).toContainText("Re");
    await expect(observation).toContainText("threshold");
    await expect(page.getByLabel("LaTeX formula source")).toContainText("R_e");
    await expect(page.getByLabel("Formula legend")).toContainText("herd-immunity");
    await page.getByRole("button", { name: "Explain booster timing" }).click();
    await expect(page.getByRole("heading", { name: "Waning immunity and booster cadence" })).toBeVisible();
  });

  test("crossing the threshold flips the outbreak verdict", async ({ page }) => {
    await page.getByRole("slider", { name: "Vaccination coverage" }).fill("0.9");
    await page
      .getByRole("radio", {
        name: "Re = 1.6, outbreak still grows because Re > 1 and the herd-immunity threshold is 75 percent.",
      })
      .check();
    await page.getByLabel("Rationale").fill("Above threshold = below Re = 1.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    const observation = page.getByRole("region", { name: "Observation" });
    await expect(observation).toContainText("contained");
  });

  test("has no serious accessibility violations in observation", async ({ page }) => {
    await page
      .getByRole("radio", {
        name: "Re = 1.6, outbreak still grows because Re > 1 and the herd-immunity threshold is 75 percent.",
      })
      .check();
    await page.getByLabel("Rationale").fill("Re below 1 means outbreak shrinks.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    await page.getByRole("region", { name: "Observation" }).waitFor();
    const results = await new AxeBuilder({ page }).analyze();
    const seriousOrCritical = results.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious",
    );
    expect(seriousOrCritical).toEqual([]);
  });
});
