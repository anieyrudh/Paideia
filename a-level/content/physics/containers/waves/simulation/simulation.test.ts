import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { mountSim } from "../../../../../../testing/sim-harness/src/playwright-contract.js";

test.describe("a-level/physics/waves/wave-superposition-lab prediction-gate", () => {
  test("prediction-gate blocks wave readouts until prediction commit", async ({ page }) => {
    await mountSim(page, "a-level/physics/waves/wave-superposition-lab");

    await expect(page.getByLabel("Observation unlocked")).toHaveCount(0);
    await expect(page.getByText("y_{\\text{resultant}}")).toHaveCount(0);

    await page.getByRole("button", { name: "Set up wave behaviour" }).click();
    await page.getByRole("button", { name: "Reveal wave behaviour" }).click();

    await expect(page.getByRole("form", { name: "Prediction gate" })).toBeVisible();
    await expect(page.getByLabel("Observation unlocked")).toHaveCount(0);
    await expect(page.getByText("y_{\\text{resultant}}")).toHaveCount(0);

    await page.getByLabel("They add to double the displacement").check();
    await page
      .getByLabel("Rationale")
      .fill("The two crests have displacement in the same direction, so the displacements add.");
    await page.getByRole("button", { name: "Commit prediction" }).click();

    await expect(page.getByLabel("Observation unlocked")).toBeVisible();
    await expect(page.getByText("Resultant at marker")).toBeVisible();
    await expect(page.getByText("+3.00 m").first()).toBeVisible();
    await expect(page.getByText("y_{\\text{resultant}}").first()).toBeVisible();
    await expect(page.getByLabel("Formula legend")).toContainText("amplitude");
  });

  test("manipulation changes the resultant and keeps formula evidence visible", async ({ page }) => {
    await mountSim(page, "a-level/physics/waves/wave-superposition-lab");

    await page.getByRole("button", { name: "Set up wave behaviour" }).click();
    await page.getByRole("slider", { name: "Phase difference" }).fill("180");
    await page.getByRole("button", { name: "Reveal wave behaviour" }).click();
    await page.getByLabel("They cancel to zero").check();
    await page
      .getByLabel("Rationale")
      .fill("The second wave is half a cycle out of phase, so its displacement is opposite.");
    await page.getByRole("button", { name: "Commit prediction" }).click();

    await expect(page.getByLabel("Observation unlocked")).toContainText("+0.00 m");
    await expect(page.getByLabel("Formula used")).toContainText("f =");
    await expect(page.getByLabel("Formula used")).toContainText("Result:");
  });

  test("has no serious accessibility violations after reveal", async ({ page }) => {
    await mountSim(page, "a-level/physics/waves/wave-superposition-lab");

    await page.getByRole("button", { name: "Set up wave behaviour" }).click();
    await page.getByRole("button", { name: "Reveal wave behaviour" }).click();
    await page.getByLabel("They add to double the displacement").check();
    await page
      .getByLabel("Rationale")
      .fill("In phase waves reinforce because the two displacements have the same sign.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    await page.getByLabel("Observation unlocked").waitFor();

    const results = await new AxeBuilder({ page }).analyze();
    const seriousOrCritical = results.violations.filter(
      (violation) => violation.impact === "critical" || violation.impact === "serious",
    );

    expect(seriousOrCritical).toEqual([]);
  });
});
