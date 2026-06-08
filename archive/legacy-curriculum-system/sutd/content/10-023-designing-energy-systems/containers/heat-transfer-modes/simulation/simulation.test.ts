import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { mountSim } from "../../../../../../testing/sim-harness/src/playwright-contract.js";

const simId = "sutd/10-023-designing-energy-systems/heat-transfer-modes/heat-flow-comparison-lab";

test.describe("Heat Transfer Modes", () => {
  test("prediction-checkpoint keeps heat-flow evidence visible while saving reflection", async ({ page }) => {
    await mountSim(page, simId);

    await page
      .getByLabel("They approximately double because both are proportional to Delta T.")
      .check();
    await page.getByLabel("Rationale").fill("Both formulae contain the same temperature difference.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    await expect(page.getByLabel("Heat-transfer readout")).toContainText("Conduction");
    await expect(page.getByLabel("Formula used")).toContainText("q_cond");
  });

  test("manipulation changes the visible conduction readout", async ({ page }) => {
    await mountSim(page, simId);
    await page
      .getByLabel("They approximately double because both are proportional to Delta T.")
      .check();
    await page.getByLabel("Rationale").fill("Heat flow changes with temperature difference.");
    await page.getByRole("button", { name: "Commit prediction" }).click();

    await expect(page.getByLabel("Heat-transfer readout")).toContainText("500 W");
    await page.getByRole("slider", { name: "Wall thickness" }).fill("0.32");
    await expect(page.getByLabel("Heat-transfer readout")).toContainText("250 W");
  });

  test("has no serious accessibility violations after reveal", async ({ page }) => {
    await mountSim(page, simId);
    await page
      .getByLabel("They approximately double because both are proportional to Delta T.")
      .check();
    await page.getByLabel("Rationale").fill("Delta T drives heat flow, while each mode has a different coefficient.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    await page.getByLabel("Observation unlocked").waitFor();

    const results = await new AxeBuilder({ page }).analyze();
    const seriousOrCritical = results.violations.filter(
      (violation) => violation.impact === "critical" || violation.impact === "serious",
    );
    expect(seriousOrCritical).toEqual([]);
  });
});
