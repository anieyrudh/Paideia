import { expect, test } from "@playwright/test";

const route =
  "/?sim=sutd/10-017-technological-world-e-and-m/maxwell-equations-and-em-waves/maxwell-equations-and-em-waves";

test.describe("Maxwell Equations and EM Waves", () => {
  test("prediction-checkpoint keeps wave evidence visible while saving reflection", async ({ page }) => {
    await page.goto(route);
    {
      const setupButton = page.getByRole("button", { name: "Prepare Maxwell model" });
      if ((await setupButton.count()) > 0) {
        await setupButton.first().click();
      }
    }
    await page.getByRole("button", { name: "Reveal wave model" }).click();
    await expect(page.getByRole("form", { name: "Prediction checkpoint" })).toBeVisible();
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

    {
      const setupButton = page.getByRole("button", { name: "Prepare Maxwell model" });
      if ((await setupButton.count()) > 0) {
        await setupButton.first().click();
      }
    }
    await page.getByLabel("Relative permittivity").fill("4");
    await page.getByRole("button", { name: "Reveal wave model" }).click();
    await expect(page.getByRole("form", { name: "Prediction checkpoint" })).toBeVisible();
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
