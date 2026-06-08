import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { expectProductSimulationReveal } from "../../../../../../testing/sim-harness/src/playwright-contract.js";

const simId =
  "sutd/10-017-technological-world-e-and-m/coulomb-s-law-and-discrete-charge-fields/coulomb-field-vector-lab";

test.describe("Coulomb's Law and Discrete Charge Fields", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`/?sim=${simId}`);
  });

  test("satisfies the product reveal visual contract", async ({ page }) => {
    await expectProductSimulationReveal(page, {
      simId,
      setup: [
        { role: "button", name: "Set charge position" },
        { role: "button", name: "Reveal field result" },
      ],
      prediction: {
        optionLabel:
          "To the left, because a negative test charge feels force opposite to the electric field.",
        rationale:
          "The positive source sets a rightward field, but the negative test charge feels force opposite to the field.",
      },
    });
  });

  test("prediction-checkpoint keeps field evidence visible while saving reflection", async ({ page }) => {
    {
      const setupButton = page.getByRole("button", { name: "Set charge position" });
      if ((await setupButton.count()) > 0) {
        await setupButton.first().click();
      }
    }
    await page.getByRole("button", { name: "Reveal field result" }).click();
    await expect(page.getByRole("form", { name: "Prediction checkpoint" })).toBeVisible();

    await page
      .getByRole("radio", {
        name: "To the left, because a negative test charge feels force opposite to the electric field.",
      })
      .check();
    await page.getByLabel("Rationale").fill("The positive source sets a rightward field, but q is negative.");
    await page.getByRole("button", { name: "Commit prediction" }).click();

    const observation = page.getByRole("region", { name: "Observation unlocked" });
    await expect(observation).toBeVisible();
    await expect(observation).toContainText("Electric field strength");
    await expect(page.getByLabel("Electric field formula")).toContainText("E");
    await expect(page.getByLabel("Formula legend")).toContainText("test charge");
  });

  test("manipulation changes visible force state", async ({ page }) => {
    {
      const setupButton = page.getByRole("button", { name: "Set charge position" });
      if ((await setupButton.count()) > 0) {
        await setupButton.first().click();
      }
    }
    await page.getByRole("slider", { name: "Test charge" }).fill("20");
    await page.getByRole("button", { name: "Reveal field result" }).click();
    await page
      .getByRole("radio", {
        name: "To the left, because a negative test charge feels force opposite to the electric field.",
      })
      .check();
    await page.getByLabel("Rationale").fill("The selected test charge changes how the force follows the field.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    await expect(page.getByRole("region", { name: "Observation unlocked" })).toContainText(
      "The positive test charge feels force in the field direction.",
    );
  });

  test("has no serious accessibility violations after reveal", async ({ page }) => {
    {
      const setupButton = page.getByRole("button", { name: "Set charge position" });
      if ((await setupButton.count()) > 0) {
        await setupButton.first().click();
      }
    }
    await page.getByRole("button", { name: "Reveal field result" }).click();
    await page
      .getByRole("radio", {
        name: "To the left, because a negative test charge feels force opposite to the electric field.",
      })
      .check();
    await page.getByLabel("Rationale").fill("Field and force are related but not identical.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    await page.getByRole("region", { name: "Observation unlocked" }).waitFor();

    const results = await new AxeBuilder({ page }).analyze();
    const seriousOrCritical = results.violations.filter(
      (violation) => violation.impact === "critical" || violation.impact === "serious",
    );
    expect(seriousOrCritical).toEqual([]);
  });
});
