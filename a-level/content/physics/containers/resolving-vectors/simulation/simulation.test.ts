import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import {
  definePredictionGateContract,
  mountSim,
} from "../../../../../../testing/sim-harness/src/playwright-contract.js";

const simId = "a-level/physics/resolving-vectors/component-resolution";

// prediction-gate: this sim must block component readouts until prediction commit.
definePredictionGateContract({
  simId,
  predictionLabel: "8.7 N",
  rationale: "The horizontal component is adjacent to the 30 degree angle, so cosine applies.",
  expectedText: ["Horizontal component", "8.7 N", "Formula used"],
});

test.describe(`${simId} accessibility`, () => {
  test("has no serious accessibility violations after reveal", async ({ page }) => {
    await mountSim(page, simId);
    await page.getByLabel("8.7 N").check();
    await page
      .getByLabel("Rationale")
      .fill("The horizontal component is adjacent to the 30 degree angle, so cosine applies.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    await page.getByLabel("Observation unlocked").waitFor();

    const results = await new AxeBuilder({ page }).analyze();
    const seriousOrCritical = results.violations.filter(
      (violation) => violation.impact === "critical" || violation.impact === "serious",
    );

    expect(seriousOrCritical).toEqual([]);
  });
});
