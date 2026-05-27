import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("Immune System and Vaccines", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(
      "/?sim=sutd/10-019-science-and-technology-for-healthcare/immune-system-and-vaccines/immune-system-and-vaccines",
    );
  });

  test("prediction-gate blocks Re evidence until commit", async ({ page }) => {
    await expect(page.getByRole("region", { name: "Observation unlocked" })).toHaveCount(0);

    await page.getByRole("button", { name: "Set up herd immunity" }).click();
    await page.getByRole("button", { name: "Reveal effective reproduction number" }).click();

    await expect(page.getByRole("form", { name: "Prediction gate" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Observation unlocked" })).toHaveCount(0);

    await page
      .getByRole("radio", {
        name: "Re = 1.6, outbreak still grows because Re > 1 and the herd-immunity threshold is 75 percent.",
      })
      .check();
    await page
      .getByLabel("Rationale")
      .fill("Re = R0 (1 - p) = 4 * 0.4 = 1.6; threshold is 1 - 1/4 = 0.75.");
    await page.getByRole("button", { name: "Commit prediction" }).click();

    const observation = page.getByRole("region", { name: "Observation unlocked" });
    await expect(observation).toBeVisible();
    await expect(observation).toContainText("Re");
    await expect(observation).toContainText("threshold");
    await expect(page.getByLabel("LaTeX formula source")).toContainText("R_e");
    await expect(page.getByLabel("Formula legend")).toContainText("herd-immunity");
    await page.getByRole("button", { name: "Explain booster timing" }).click();
    await expect(page.getByRole("heading", { name: "Waning immunity and booster cadence" })).toBeVisible();
  });

  test("crossing the threshold flips the outbreak verdict", async ({ page }) => {
    await page.getByRole("button", { name: "Set up herd immunity" }).click();
    await page.getByRole("slider", { name: "Vaccination coverage" }).fill("0.9");
    await page.getByRole("button", { name: "Reveal effective reproduction number" }).click();
    await page
      .getByRole("radio", {
        name: "Re = 1.6, outbreak still grows because Re > 1 and the herd-immunity threshold is 75 percent.",
      })
      .check();
    await page.getByLabel("Rationale").fill("Above threshold = below Re = 1.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    const observation = page.getByRole("region", { name: "Observation unlocked" });
    await expect(observation).toContainText("contained");
  });

  test("has no serious accessibility violations after reveal", async ({ page }) => {
    await page.getByRole("button", { name: "Set up herd immunity" }).click();
    await page.getByRole("button", { name: "Reveal effective reproduction number" }).click();
    await page
      .getByRole("radio", {
        name: "Re = 1.6, outbreak still grows because Re > 1 and the herd-immunity threshold is 75 percent.",
      })
      .check();
    await page.getByLabel("Rationale").fill("Re below 1 means outbreak shrinks.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    await page.getByRole("region", { name: "Observation unlocked" }).waitFor();
    const results = await new AxeBuilder({ page }).analyze();
    const seriousOrCritical = results.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious",
    );
    expect(seriousOrCritical).toEqual([]);
  });
});
