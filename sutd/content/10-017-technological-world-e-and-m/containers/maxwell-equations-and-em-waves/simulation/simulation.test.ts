import { expect, test } from "@playwright/test";

const route =
  "/?sim=sutd/10-017-technological-world-e-and-m/maxwell-equations-and-em-waves/maxwell-equations-and-em-waves";

test.describe("Maxwell Equations and EM Waves", () => {
  test("prediction-gate blocks wave evidence until commit", async ({ page }) => {
    await page.goto(route);

    await expect(page.getByRole("region", { name: "Observation unlocked" })).toHaveCount(0);
    await page.getByRole("button", { name: "Prepare Maxwell model" }).click();
    await page.getByRole("button", { name: "Reveal wave model" }).click();
    await expect(page.getByRole("form", { name: "Prediction gate" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Observation unlocked" })).toHaveCount(0);
    await page
      .getByRole("radio", {
        name: "It sustains a changing magnetic field, allowing a transverse electromagnetic wave to propagate.",
      })
      .check();
    await page.getByLabel("Rationale").fill("Changing electric fields sustain magnetic fields.");
    await page.getByRole("button", { name: "Commit prediction" }).click();

    const observation = page.getByRole("region", { name: "Observation unlocked" });
    await expect(observation).toBeVisible();
    await expect(observation).toContainText("Wave speed");
    await expect(observation).toContainText("visible");
  });

  test("manipulation changes visible wavelength state", async ({ page }) => {
    await page.goto(route);

    await page.getByRole("button", { name: "Prepare Maxwell model" }).click();
    await page.getByLabel("Relative permittivity").fill("4");
    await page.getByRole("button", { name: "Reveal wave model" }).click();
    await expect(page.getByRole("form", { name: "Prediction gate" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Observation unlocked" })).toHaveCount(0);
    await page
      .getByRole("radio", {
        name: "It sustains a changing magnetic field, allowing a transverse electromagnetic wave to propagate.",
      })
      .check();
    await page.getByLabel("Rationale").fill("A changing electric field creates magnetic circulation.");
    await page.getByRole("button", { name: "Commit prediction" }).click();

    const observation = page.getByRole("region", { name: "Observation unlocked" });
    await expect(observation).toContainText("1.50e+8 m/s");
    await expect(observation).toContainText("2.50e-7 m");
  });
});
