import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import {
  definePredictionGateContract,
  mountSim,
} from "../../../../../../testing/sim-harness/src/playwright-contract.js";

const simId = "a-level/physics/physical-quantities-and-units/measurement-uncertainty-lab";

// prediction-gate: the lab notebook must not reveal the complete speed record before commit.
definePredictionGateContract({
  simId,
  predictionLabel: "2.50 m s^-1 ± 0.09 m s^-1",
  rationale: "A complete measurement record needs value, unit, and uncertainty.",
  expectedText: ["Formula and unit reasoning", "v = 2.50 ± 0.09 m s^-1", "derived quantity"],
});

test.describe(`${simId} accessibility`, () => {
  test("has no serious accessibility violations after reveal", async ({ page }) => {
    await mountSim(page, simId);
    await page.getByLabel("2.50 m s^-1 ± 0.09 m s^-1").check();
    await page
      .getByLabel("Rationale")
      .fill("A complete measurement record needs value, unit, and uncertainty.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    await page.getByLabel("Observation unlocked").waitFor();

    const results = await new AxeBuilder({ page }).analyze();
    const seriousOrCritical = results.violations.filter(
      (violation) => violation.impact === "critical" || violation.impact === "serious",
    );

    expect(seriousOrCritical).toEqual([]);
  });
});
