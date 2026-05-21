import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { mountSim } from "../../../../../../testing/sim-harness/src/playwright-contract.js";

test.describe("a-level/physics/electric-fields/charge-field-vector-lab prediction-gate", () => {
  test("prediction-gate blocks electric field readouts until prediction commit", async ({ page }) => {
    await mountSim(page, "a-level/physics/electric-fields/charge-field-vector-lab");

    await expect(page.getByLabel("Observation unlocked")).toHaveCount(0);
    await expect(page.getByText("Electric field strength").first()).toHaveCount(0);

    await page.getByRole("button", { name: "Set charge position" }).click();
    await page.getByRole("button", { name: "Reveal field result" }).click();

    await expect(page.getByRole("form", { name: "Prediction gate" })).toBeVisible();
    await expect(page.getByLabel("Observation unlocked")).toHaveCount(0);
    await expect(page.getByText("Electric field strength").first()).toHaveCount(0);

    await page.getByLabel("To the left").check();
    await page
      .getByLabel("Rationale")
      .fill("A negative test charge feels force opposite to the electric field direction.");
    await page.getByRole("button", { name: "Commit prediction" }).click();

    await expect(page.getByLabel("Observation unlocked")).toBeVisible();
    await expect(page.getByText("Electric field strength", { exact: true })).toBeVisible();
    await expect(page.getByText("2.00 x 10^5 N/C").first()).toBeVisible();
    await expect(page.getByText("Delta U = q Delta V").first()).toBeVisible();
  });

  test("main controls change visible field state before reveal", async ({ page }) => {
    await mountSim(page, "a-level/physics/electric-fields/charge-field-vector-lab");

    await page.getByRole("button", { name: "Set charge position" }).click();
    await page.getByLabel("Separation").fill("10");
    await page.getByRole("button", { name: "Reveal field result" }).click();
    await page.getByLabel("To the left").check();
    await page.getByLabel("Rationale").fill("Closer points have stronger inverse-square fields.");
    await page.getByRole("button", { name: "Commit prediction" }).click();

    await expect(page.getByLabel("Electric field readout")).toContainText("4.49 x 10^5 N/C");
  });

  test("has no serious accessibility violations after reveal", async ({ page }) => {
    await mountSim(page, "a-level/physics/electric-fields/charge-field-vector-lab");

    await page.getByRole("button", { name: "Set charge position" }).click();
    await page.getByRole("button", { name: "Reveal field result" }).click();
    await page.getByLabel("To the left").check();
    await page
      .getByLabel("Rationale")
      .fill("A negative test charge feels force opposite to the electric field.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    await page.getByLabel("Observation unlocked").waitFor();

    const results = await new AxeBuilder({ page }).analyze();
    const seriousOrCritical = results.violations.filter(
      (violation) => violation.impact === "critical" || violation.impact === "serious",
    );

    expect(seriousOrCritical).toEqual([]);
  });
});
