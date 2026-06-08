import { expect, test } from "@playwright/test";
import { expectProductSimulationReveal } from "../../../../../../testing/sim-harness/src/playwright-contract.js";

const simId =
  "sutd/10-017-technological-world-e-and-m/capacitor-with-dielectric/capacitor-with-dielectric";
const route = `/?sim=${simId}`;
const predictionOption =
  "Both capacitance and stored energy increase in proportion to the dielectric constant.";

test.describe("Capacitor with Dielectric", () => {
  test("satisfies the product reveal visual contract", async ({ page }) => {
    await expectProductSimulationReveal(page, {
      simId,
      setup: [],
      prediction: {
        optionLabel: predictionOption,
        rationale: "At fixed voltage, increasing kappa raises C, so Q and U rise.",
      },
    });
  });

  test("prediction-checkpoint keeps reveal visible while saving reflection", async ({ page }) => {
    await page.goto(route);

    await expect(page.getByText("Dielectric capacitor evidence")).toBeVisible();
    await expect(page.getByRole("form", { name: "Prediction checkpoint" })).toBeVisible();

    await page.getByRole("radio", { name: predictionOption }).check();
    await page
      .getByLabel("Rationale")
      .fill("At fixed voltage, increasing kappa raises C, so Q and U rise.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    await expect(page.getByText("Dielectric capacitor evidence")).toBeVisible();
  });

  test("manipulation changes visible capacitance", async ({ page }) => {
    await page.goto(route);

    await page.getByRole("slider", { name: "Dielectric constant" }).evaluate((element) => {
      const input = element as HTMLInputElement;
      const valueSetter = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value",
      )?.set;
      valueSetter?.call(input, "6");
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });

    await expect(page.getByText("6.00 times the same air-filled geometry")).toBeVisible();
  });
});
