import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("Cell Cycle and Mitosis / Meiosis", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(
      "/?sim=sutd/10-019-science-and-technology-for-healthcare/cell-cycle-and-mitosis-meiosis/cell-cycle-and-mitosis-meiosis",
    );
  });

  test("prediction-gate blocks division evidence until commit", async ({ page }) => {
    await expect(page.getByRole("region", { name: "Observation unlocked" })).toHaveCount(0);

    await page.getByRole("button", { name: "Set up cell cycle" }).click();
    await page.getByRole("button", { name: "Reveal division outcome" }).click();

    await expect(page.getByRole("form", { name: "Prediction gate" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Observation unlocked" })).toHaveCount(0);

    await page
      .getByRole("radio", {
        name: "Two diploid (n = 2) G1 daughters, each with DNA content 1 (unreplicated).",
      })
      .check();
    await page
      .getByLabel("Rationale")
      .fill("Mitosis preserves ploidy and resets DNA content to 1 in daughters.");
    await page.getByRole("button", { name: "Commit prediction" }).click();

    const observation = page.getByRole("region", { name: "Observation unlocked" });
    await expect(observation).toBeVisible();
    await expect(observation).toContainText("Daughter cells");
    await expect(observation).toContainText("Ploidy");
    await expect(page.getByLabel("LaTeX formula source")).toContainText("ploidy");
    await expect(page.getByLabel("Formula legend")).toContainText("DNA content");
  });

  test("DNA damaged toggle pins the cell at the G1/S checkpoint", async ({ page }) => {
    await page.getByRole("button", { name: "Set up cell cycle" }).click();
    await page.getByRole("checkbox", { name: "DNA damaged" }).check();
    await page.getByRole("button", { name: "Reveal division outcome" }).click();
    await page
      .getByRole("radio", {
        name: "Two diploid (n = 2) G1 daughters, each with DNA content 1 (unreplicated).",
      })
      .check();
    await page.getByLabel("Rationale").fill("G1/S checkpoint fails on damage.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    const observation = page.getByRole("region", { name: "Observation unlocked" });
    await expect(observation).toContainText("G1/S");
  });

  test("has no serious accessibility violations after reveal", async ({ page }) => {
    await page.getByRole("button", { name: "Set up cell cycle" }).click();
    await page.getByRole("button", { name: "Reveal division outcome" }).click();
    await page
      .getByRole("radio", {
        name: "Two diploid (n = 2) G1 daughters, each with DNA content 1 (unreplicated).",
      })
      .check();
    await page.getByLabel("Rationale").fill("Mitosis preserves ploidy.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    await page.getByRole("region", { name: "Observation unlocked" }).waitFor();
    const results = await new AxeBuilder({ page }).analyze();
    const seriousOrCritical = results.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious",
    );
    expect(seriousOrCritical).toEqual([]);
  });
});
