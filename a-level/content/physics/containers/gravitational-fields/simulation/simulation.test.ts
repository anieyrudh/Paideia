import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { mountSim } from "../../../../../../testing/sim-harness/src/playwright-contract.js";

test.describe("a-level/physics/gravitational-fields/inverse-square-field-lab prediction-gate", () => {
  test("prediction-gate blocks field and potential readouts until prediction commit", async ({ page }) => {
    await mountSim(page, "a-level/physics/gravitational-fields/inverse-square-field-lab");

    await expect(page.getByLabel("Observation unlocked")).toHaveCount(0);
    await expect(page.getByText("g = GM / r^2")).toHaveCount(0);

    await page.getByRole("button", { name: "Set up field lab" }).click();
    await page.getByRole("button", { name: "Reveal field strength" }).click();

    await expect(page.getByRole("form", { name: "Prediction gate" })).toBeVisible();
    await expect(page.getByLabel("Observation unlocked")).toHaveCount(0);
    await expect(page.getByText("Potential")).toHaveCount(0);

    await page.getByLabel("It becomes one quarter as large.").check();
    await page.getByLabel("Rationale").fill("The field follows g = GM / r squared.");
    await page.getByRole("button", { name: "Commit prediction" }).click();

    await expect(page.getByLabel("Observation unlocked")).toBeVisible();
    await expect(page.getByLabel("Gravitational field readout")).toContainText("Field strength");
    await expect(page.getByLabel("Gravitational field readout")).toContainText("9.820 N kg^-1");
    await expect(page.getByText("g = GM / r^2").first()).toBeVisible();
  });

  test("manipulation changes visible field strength and formula interpretation", async ({ page }) => {
    await mountSim(page, "a-level/physics/gravitational-fields/inverse-square-field-lab");

    await page.getByRole("button", { name: "Set up field lab" }).click();
    await page.getByLabel("Field point radius").fill("2");
    await page.getByLabel("Comparison radius").fill("1");
    await page.getByRole("button", { name: "Reveal field strength" }).click();
    await page.getByLabel("It becomes one quarter as large.").check();
    await page.getByLabel("Rationale").fill("Doubling radius makes the denominator four times larger.");
    await page.getByRole("button", { name: "Commit prediction" }).click();

    await expect(page.getByLabel("Gravitational field readout")).toContainText("2.455 N kg^-1");
    await expect(page.getByLabel("Formula used")).toContainText("which is 4.000 times the current field");
  });

  test("has no serious accessibility violations after reveal", async ({ page }) => {
    await mountSim(page, "a-level/physics/gravitational-fields/inverse-square-field-lab");

    await page.getByRole("button", { name: "Set up field lab" }).click();
    await page.getByRole("button", { name: "Reveal field strength" }).click();
    await page.getByLabel("It becomes one quarter as large.").check();
    await page
      .getByLabel("Rationale")
      .fill("The field follows an inverse-square law, so doubling radius quarters the strength.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    await page.getByLabel("Observation unlocked").waitFor();

    const results = await new AxeBuilder({ page }).analyze();
    const seriousOrCritical = results.violations.filter(
      (violation) => violation.impact === "critical" || violation.impact === "serious",
    );

    expect(seriousOrCritical).toEqual([]);
  });
});
