import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("Gene Expression DNA to RNA to Protein", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(
      "/?sim=sutd/10-019-science-and-technology-for-healthcare/gene-expression-dna-to-rna-to-protein/gene-expression-dna-to-rna-to-protein",
    );
  });

  test("prediction-gate blocks central-dogma evidence until commit", async ({ page }) => {
    await expect(page.getByRole("region", { name: "Observation unlocked" })).toHaveCount(0);

    await page.getByRole("button", { name: "Set up gene expression" }).click();
    await page.getByRole("button", { name: "Reveal central dogma output" }).click();

    await expect(page.getByRole("form", { name: "Prediction gate" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Observation unlocked" })).toHaveCount(0);

    await page
      .getByRole("radio", {
        name: "Both rise toward a saturating plateau set by the maximum transcription rate and the per-molecule decay constants.",
      })
      .check();
    await page
      .getByLabel("Rationale")
      .fill("Inducer raises the Hill term, which raises transcription up to the maximum.");
    await page.getByRole("button", { name: "Commit prediction" }).click();

    const observation = page.getByRole("region", { name: "Observation unlocked" });
    await expect(observation).toBeVisible();
    await expect(observation).toContainText("Central dogma");
    await expect(observation).toContainText("AUG");
    await expect(observation).toContainText("M");
    await expect(page.getByLabel("LaTeX formula source")).toContainText("dM");
    await expect(page.getByLabel("Formula legend")).toContainText("transcription");
  });

  test("point mutation preset changes the translated protein", async ({ page }) => {
    await page.getByRole("button", { name: "Set up gene expression" }).click();
    await page
      .getByRole("combobox", { name: "DNA preset" })
      .selectOption("mutation-elf-to-ely");
    await page.getByRole("button", { name: "Reveal central dogma output" }).click();
    await page
      .getByRole("radio", {
        name: "Both rise toward a saturating plateau set by the maximum transcription rate and the per-molecule decay constants.",
      })
      .check();
    await page
      .getByLabel("Rationale")
      .fill("A point mutation can change the protein sequence.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    const observation = page.getByRole("region", { name: "Observation unlocked" });
    await expect(observation).toContainText("Y");
  });

  test("has no serious accessibility violations after reveal", async ({ page }) => {
    await page.getByRole("button", { name: "Set up gene expression" }).click();
    await page.getByRole("button", { name: "Reveal central dogma output" }).click();
    await page
      .getByRole("radio", {
        name: "Both rise toward a saturating plateau set by the maximum transcription rate and the per-molecule decay constants.",
      })
      .check();
    await page.getByLabel("Rationale").fill("Hill saturation pins the plateau.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    await page.getByRole("region", { name: "Observation unlocked" }).waitFor();
    const results = await new AxeBuilder({ page }).analyze();
    const seriousOrCritical = results.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious",
    );
    expect(seriousOrCritical).toEqual([]);
  });
});
