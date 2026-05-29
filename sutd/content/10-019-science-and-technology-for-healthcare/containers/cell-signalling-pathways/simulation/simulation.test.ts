import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("Cell Signalling Pathways", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(
      "/?sim=sutd/10-019-science-and-technology-for-healthcare/cell-signalling-pathways/cell-signalling-pathways",
    );
  });

  test("prediction-checkpoint keeps cascade evidence visible while saving reflection", async ({ page }) => {

    {

      const setupButton = page.getByRole("button", { name: "Set up signalling cascade" });

      if ((await setupButton.count()) > 0) {

        await setupButton.first().click();

      }

    }
    await page.getByRole("button", { name: "Reveal cascade output" }).click();

    await expect(page.getByRole("form", { name: "Prediction checkpoint" })).toBeVisible();

    await page
      .getByRole("radio", {
        name: "A sigmoidal saturating curve, steepest near the receptor's threshold and flat above it.",
      })
      .check();
    await page
      .getByLabel("Rationale")
      .fill("Stacked saturating responses keep the curve bounded and sigmoidal.");
    await page.getByRole("button", { name: "Commit prediction" }).click();

    const observation = page.getByRole("region", { name: "Observation unlocked" });
    await expect(observation).toBeVisible();
    await expect(observation).toContainText("Cascade output");
    await expect(observation).toContainText("ligand");
    await expect(observation).toContainText("transcription factor");
    await expect(page.getByLabel("LaTeX formula source")).toContainText("\\sigma");
    await expect(page.getByLabel("Formula legend")).toContainText("logistic");
    await page.getByRole("button", { name: "Explain the threshold" }).click();
    await expect(page.getByRole("heading", { name: "Why can a small inhibitor flip the output?" })).toBeVisible();
    await expect(page.getByText("Transfer challenge")).toBeVisible();
  });

  test("raising the phosphatase inhibitor switches off the transcription factor", async ({ page }) => {
    {
      const setupButton = page.getByRole("button", { name: "Set up signalling cascade" });
      if ((await setupButton.count()) > 0) {
        await setupButton.first().click();
      }
    }
    await page.getByRole("slider", { name: "Phosphatase inhibitor" }).fill("0.9");
    await page.getByRole("button", { name: "Reveal cascade output" }).click();
    await page
      .getByRole("radio", {
        name: "A sigmoidal saturating curve, steepest near the receptor's threshold and flat above it.",
      })
      .check();
    await page.getByLabel("Rationale").fill("Inhibitor enters effective input.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    const observation = page.getByRole("region", { name: "Observation unlocked" });
    await expect(observation).toContainText("off");
  });

  test("has no serious accessibility violations after reveal", async ({ page }) => {
    {
      const setupButton = page.getByRole("button", { name: "Set up signalling cascade" });
      if ((await setupButton.count()) > 0) {
        await setupButton.first().click();
      }
    }
    await page.getByRole("button", { name: "Reveal cascade output" }).click();
    await page
      .getByRole("radio", {
        name: "A sigmoidal saturating curve, steepest near the receptor's threshold and flat above it.",
      })
      .check();
    await page.getByLabel("Rationale").fill("Saturating chain yields sigmoidal curve.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    await page.getByRole("region", { name: "Observation unlocked" }).waitFor();
    const results = await new AxeBuilder({ page }).analyze();
    const seriousOrCritical = results.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious",
    );
    expect(seriousOrCritical).toEqual([]);
  });
});
