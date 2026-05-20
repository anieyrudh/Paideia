// prediction-gate contract: mounted by the generic browser sim harness.

import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import {
  definePredictionGateContract,
  mountSim,
} from "../../../../../../testing/sim-harness/src/playwright-contract.js";

const simId = "a-level/physics/scalars-and-vectors/resultant-magnitude";

definePredictionGateContract({
  simId,
  predictionLabel: "7.1 m",
  rationale: "Perpendicular arrows should form a right triangle, not a straight line.",
  expectedText: ["Geometric resultant", "7.1 m", "10.0 m"],
});

test.describe(`${simId} accessibility`, () => {
  test("has no serious accessibility violations after reveal", async ({ page }) => {
    await mountSim(page, simId);
    await page.getByLabel("7.1 m").check();
    await page
      .getByLabel("Rationale")
      .fill("Perpendicular arrows should form a right triangle, not a straight line.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    await page.getByLabel("Observation unlocked").waitFor();

    const results = await new AxeBuilder({ page }).analyze();
    const seriousOrCritical = results.violations.filter(
      (violation) => violation.impact === "critical" || violation.impact === "serious",
    );

    expect(seriousOrCritical).toEqual([]);
  });
});
