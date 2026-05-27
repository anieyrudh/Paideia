import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("Solar Energy and Band Theory", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(
      "/?sim=sutd/10-016-science-for-a-sustainable-world/solar-energy-and-band-theory/solar-energy-and-band-theory",
    );
  });

  test("prediction-gate blocks band-gap evidence until commit", async ({ page }) => {
    await expect(page.getByRole("region", { name: "Observation unlocked" })).toHaveCount(0);

    await page.getByRole("button", { name: "Set up band-gap check" }).click();
    await page.getByRole("button", { name: "Reveal band-gap evidence" }).click();

    await expect(page.getByRole("form", { name: "Prediction gate" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Observation unlocked" })).toHaveCount(0);

    await page
      .getByRole("radio", { name: "It cannot excite an electron across the gap" })
      .check();
    await page.getByLabel("Rationale").fill("Below-gap photons cannot move electrons into the conduction band.");
    await page.getByRole("button", { name: "Commit prediction" }).click();

    const observation = page.getByRole("region", { name: "Observation unlocked" });
    await expect(observation).toBeVisible();
    await expect(observation).toContainText("Band-gap evidence");
    await expect(observation).toContainText("Photon energy");
    await expect(page.getByLabel("LaTeX formula source")).toContainText("E_{photon}");
    await expect(page.getByLabel("Formula legend")).toContainText("band gap");
  });

  test("manipulation switches absorption verdict", async ({ page }) => {
    await page.getByRole("button", { name: "Set up band-gap check" }).click();
    await page.getByRole("slider", { name: "Photon wavelength" }).fill("1000");
    await page.getByRole("slider", { name: "Semiconductor band gap" }).fill("1.8");
    await page.getByRole("button", { name: "Reveal band-gap evidence" }).click();
    await page
      .getByRole("radio", { name: "It cannot excite an electron across the gap" })
      .check();
    await page.getByLabel("Rationale").fill("Long wavelength light has too little photon energy for this material.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    await expect(page.getByRole("region", { name: "Observation unlocked" })).toContainText("below band gap");
  });

  test("has no serious accessibility violations after reveal", async ({ page }) => {
    await page.getByRole("button", { name: "Set up band-gap check" }).click();
    await page.getByRole("button", { name: "Reveal band-gap evidence" }).click();
    await page
      .getByRole("radio", { name: "It cannot excite an electron across the gap" })
      .check();
    await page.getByLabel("Rationale").fill("The photon energy comparison is the threshold.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    await page.getByRole("region", { name: "Observation unlocked" }).waitFor();

    const results = await new AxeBuilder({ page }).analyze();
    const seriousOrCritical = results.violations.filter(
      (violation) => violation.impact === "critical" || violation.impact === "serious",
    );

    expect(seriousOrCritical).toEqual([]);
  });
});
