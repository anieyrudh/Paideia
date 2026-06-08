import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { expectProductSimulationExperience } from "../../../../../../testing/sim-harness/src/playwright-contract.js";

test.describe("Protein Folding and Function", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(
      "/?sim=sutd/10-019-science-and-technology-for-healthcare/protein-folding-and-function/protein-folding-and-function",
    );
  });

  test("satisfies the product simulation experience contract", async ({ page }) => {
    await expectProductSimulationExperience(page, {
      simId:
        "sutd/10-019-science-and-technology-for-healthcare/protein-folding-and-function/protein-folding-and-function",
      setup: [],
      prediction: {
        optionLabel:
          "It collapses into a hydrophobic cluster; the fold also depends on chain length, environment, and chaperones.",
        rationale: "Hydrophobic residues cluster, but sequence is not enough to fix the fold.",
      },
      observation: { observationLabel: "Observation" },
    });
  });

  test("prediction-checkpoint keeps hydropathy evidence visible while saving reflection", async ({ page }) => {
    await expect(page.getByRole("form", { name: "Prediction checkpoint" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Observation" })).toBeVisible();

    await page
      .getByRole("radio", {
        name: "It collapses into a hydrophobic cluster; the fold also depends on chain length, environment, and chaperones.",
      })
      .check();
    await page
      .getByLabel("Rationale")
      .fill("Hydrophobic residues cluster, but sequence is not enough to fix the fold.");
    await page.getByRole("button", { name: "Commit prediction" }).click();

    const observation = page.getByRole("region", { name: "Observation" });
    await expect(observation).toBeVisible();
    await expect(observation).toContainText("Hydropathy profile");
    await expect(page.getByLabel("LaTeX formula source")).toContainText("\\bar{H}");
    await expect(page.getByLabel("Formula legend")).toContainText("Kyte-Doolittle");
  });

  test("switching to poly-lysine flips the dominant region label", async ({ page }) => {
    await page
      .getByRole("combobox", { name: "Sequence preset" })
      .selectOption("poly-lys");
    await page
      .getByRole("radio", {
        name: "It collapses into a hydrophobic cluster; the fold also depends on chain length, environment, and chaperones.",
      })
      .check();
    await page
      .getByLabel("Rationale")
      .fill("Switching residues should flip the verdict toward hydrophilic.");
    await page.getByRole("button", { name: "Commit prediction" }).click();

    const observation = page.getByRole("region", { name: "Observation" });
    await expect(observation).toContainText("hydrophilic");
  });

  test("has no serious accessibility violations in observation", async ({ page }) => {
    await page
      .getByRole("radio", {
        name: "It collapses into a hydrophobic cluster; the fold also depends on chain length, environment, and chaperones.",
      })
      .check();
    await page.getByLabel("Rationale").fill("Hydrophobic collapse plus environment.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    await page.getByRole("region", { name: "Observation" }).waitFor();

    const results = await new AxeBuilder({ page }).analyze();
    const seriousOrCritical = results.violations.filter(
      (violation) => violation.impact === "critical" || violation.impact === "serious",
    );
    expect(seriousOrCritical).toEqual([]);
  });
});
