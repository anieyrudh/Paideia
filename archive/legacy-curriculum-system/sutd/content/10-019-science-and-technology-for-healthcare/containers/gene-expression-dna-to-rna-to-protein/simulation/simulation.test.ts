import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { expectProductSimulationExperience } from "../../../../../../testing/sim-harness/src/playwright-contract.js";

test.describe("Gene Expression DNA to RNA to Protein", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(
      "/?sim=sutd/10-019-science-and-technology-for-healthcare/gene-expression-dna-to-rna-to-protein/gene-expression-dna-to-rna-to-protein",
    );
  });

  test("satisfies the product simulation experience contract", async ({ page }) => {
    await expectProductSimulationExperience(page, {
      simId:
        "sutd/10-019-science-and-technology-for-healthcare/gene-expression-dna-to-rna-to-protein/gene-expression-dna-to-rna-to-protein",
      setup: [],
      prediction: {
        optionLabel:
          "Both rise toward a saturating plateau set by the maximum transcription rate and the per-molecule decay constants.",
        rationale: "Inducer raises the Hill term, which raises transcription up to the maximum.",
      },
      observation: { observationLabel: "Observation" },
    });
  });

  test("prediction-checkpoint keeps central-dogma evidence visible while saving reflection", async ({ page }) => {
    await expect(page.getByRole("form", { name: "Prediction checkpoint" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Observation" })).toBeVisible();

    await page
      .getByRole("radio", {
        name: "Both rise toward a saturating plateau set by the maximum transcription rate and the per-molecule decay constants.",
      })
      .check();
    await page
      .getByLabel("Rationale")
      .fill("Inducer raises the Hill term, which raises transcription up to the maximum.");
    await page.getByRole("button", { name: "Commit prediction" }).click();

    const observation = page.getByRole("region", { name: "Observation" });
    await expect(observation).toBeVisible();
    await expect(observation).toContainText("Central dogma");
    await expect(observation).toContainText("AUG");
    await expect(observation).toContainText("M");
    await expect(page.getByLabel("LaTeX formula source")).toContainText("dM");
    await expect(page.getByLabel("Formula legend")).toContainText("transcription");
    await page.getByRole("button", { name: "Explain the plateau" }).click();
    await expect(page.getByRole("heading", { name: "Why does the curve flatten?" })).toBeVisible();
    await expect(page.getByText("Transfer challenge")).toBeVisible();
  });

  test("point mutation preset changes the translated protein", async ({ page }) => {
    await page
      .getByRole("combobox", { name: "DNA preset" })
      .selectOption("mutation-elf-to-ely");
    await page
      .getByRole("radio", {
        name: "Both rise toward a saturating plateau set by the maximum transcription rate and the per-molecule decay constants.",
      })
      .check();
    await page
      .getByLabel("Rationale")
      .fill("A point mutation can change the protein sequence.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    const observation = page.getByRole("region", { name: "Observation" });
    await expect(observation).toContainText("Y");
  });

  test("has no serious accessibility violations in observation", async ({ page }) => {
    await page
      .getByRole("radio", {
        name: "Both rise toward a saturating plateau set by the maximum transcription rate and the per-molecule decay constants.",
      })
      .check();
    await page.getByLabel("Rationale").fill("Hill saturation pins the plateau.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    await page.getByRole("region", { name: "Observation" }).waitFor();

    const results = await new AxeBuilder({ page }).analyze();
    const seriousOrCritical = results.violations.filter(
      (violation) => violation.impact === "critical" || violation.impact === "serious",
    );

    expect(seriousOrCritical).toEqual([]);
  });
});
