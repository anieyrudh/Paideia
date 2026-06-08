import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("Linear Transformations", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(
      "/?sim=sutd/10-018-modelling-space-and-systems-multivariable-calc-and-linear-algebra/linear-transformations/linear-transformations",
    );
  });

  test("prediction-checkpoint keeps classifier evidence visible while saving reflection", async ({ page }) => {

    {

      const setupButton = page.getByRole("button", { name: "Set up classifier check" });

      if ((await setupButton.count()) > 0) {

        await setupButton.first().click();

      }

    }
    await page.getByRole("button", { name: "Reveal classifier evidence" }).click();

    await expect(page.getByRole("form", { name: "Prediction checkpoint" })).toBeVisible();

    await page
      .getByRole("radio", {
        name: "Pure rotation by 90 degrees counter-clockwise; area preserved, orientation preserved",
      })
      .check();
    await page.getByLabel("Rationale").fill("e_1 -> (0, 1) and e_2 -> (-1, 0) is a 90 degree rotation.");
    await page.getByRole("button", { name: "Commit prediction" }).click();

    const observation = page.getByRole("region", { name: "Observation unlocked" });
    await expect(observation).toBeVisible();
    await expect(observation).toContainText("Classifier evidence");
    await expect(observation).toContainText("Rotation");
    await expect(page.getByLabel("LaTeX formula source")).toContainText("T(\\mathbf{e}_1)");
    await expect(page.getByLabel("Formula legend")).toContainText("basis image");
  });

  test("manipulation switches the classifier verdict", async ({ page }) => {
    {
      const setupButton = page.getByRole("button", { name: "Set up classifier check" });
      if ((await setupButton.count()) > 0) {
        await setupButton.first().click();
      }
    }
    await page.getByRole("slider", { name: "Top-left entry a" }).fill("2");
    await page.getByRole("slider", { name: "Top-right entry b" }).fill("0");
    await page.getByRole("slider", { name: "Bottom-left entry c" }).fill("0");
    await page.getByRole("slider", { name: "Bottom-right entry d" }).fill("0.5");
    await page.getByRole("button", { name: "Reveal classifier evidence" }).click();
    await page
      .getByRole("radio", {
        name: "Anisotropic scaling; both basis vectors stretched differently",
      })
      .check();
    await page.getByLabel("Rationale").fill("Both columns are scaled basis vectors.");
    await page.getByRole("button", { name: "Commit prediction" }).click();

    const observation = page.getByRole("region", { name: "Observation unlocked" });
    await expect(observation).toContainText("Anisotropic scaling");
  });

  test("has no serious accessibility violations after reveal", async ({ page }) => {
    {
      const setupButton = page.getByRole("button", { name: "Set up classifier check" });
      if ((await setupButton.count()) > 0) {
        await setupButton.first().click();
      }
    }
    await page.getByRole("button", { name: "Reveal classifier evidence" }).click();
    await page
      .getByRole("radio", {
        name: "Pure rotation by 90 degrees counter-clockwise; area preserved, orientation preserved",
      })
      .check();
    await page.getByLabel("Rationale").fill("Columns are e_1 rotated and e_2 rotated.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    await page.getByRole("region", { name: "Observation unlocked" }).waitFor();

    const results = await new AxeBuilder({ page }).analyze();
    const seriousOrCritical = results.violations.filter(
      (violation) => violation.impact === "critical" || violation.impact === "serious",
    );

    expect(seriousOrCritical).toEqual([]);
  });
});
