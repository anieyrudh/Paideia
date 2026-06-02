import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { expectProductSimulationReveal } from "../../../../../../testing/sim-harness/src/playwright-contract.js";

const simId = "sutd/esd/markov-chain-steady-state/markov-chain-steady-state";
const route = `/?sim=${simId}`;
const predictionOption = "Toward more congested weeks";

test.describe("Markov Chain Steady State", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => window.localStorage.clear());
    await page.goto(route);
  });

  test("satisfies the product reveal visual contract", async ({ page }) => {
    await expectProductSimulationReveal(page, {
      simId,
      setup: [],
      prediction: {
        optionLabel: predictionOption,
        rationale: "Recovery rate is low so the steady state shifts toward congestion.",
      },
    });
  });

  test("prediction-checkpoint keeps steady-state evidence visible while saving reflection", async ({ page }) => {
    await expect(page.getByRole("table", { name: "Transition matrix" })).toContainText("Smooth next");
    await expect(page.getByLabel("Formula evidence")).toContainText("pi_S = b");
    await expect(page.getByLabel("Formula legend")).toContainText("probability per week");
    await expect(page.getByRole("table", { name: "State trajectory" })).toContainText("Week");
    await expect(page.getByRole("form", { name: "Prediction checkpoint" })).toBeVisible();

    await page.getByRole("radio", { name: predictionOption }).check();
    await page
      .getByLabel("Rationale")
      .fill("Weak recovery means congestion keeps receiving enough long-run probability mass.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    await expect(page.getByRole("region", { name: "Observation unlocked" })).toBeVisible();
  });

  test("manipulation changes the visible steady-state recommendation", async ({ page }) => {
    await page.getByRole("button", { name: "fast recovery" }).click();

    await expect(page.getByRole("region", { name: "Observation unlocked" })).toContainText("82.9%");
    await expect(page.getByRole("region", { name: "Observation unlocked" })).toContainText("17.1%");
  });

  test("formula, substitution, units, interpretation, and legend are shown together", async ({ page }) => {
    await expect(page.getByLabel("Formula used")).toContainText("x_(t+1) = P x_t");
    await expect(page.getByLabel("Formula legend")).toContainText("pi");
    await expect(page.getByLabel("Formula evidence")).toContainText("Substitution");
    await expect(page.getByLabel("Formula evidence")).toContainText("Units:");
    await expect(page.getByLabel("Formula evidence")).toContainText("Result:");
    await expect(page.getByLabel("Formula evidence")).toContainText("per week");
    await expect(page.getByLabel("Formula evidence")).toContainText("Interpretation");
    await expect(page.getByLabel("Convergence chart")).toContainText("State mix over repeated weeks");

    await page.setViewportSize({ width: 390, height: 780 });
    const overflowing = await page
      .getByLabel("Formula evidence")
      .evaluate((element) => element.scrollWidth > element.clientWidth + 1);
    expect(overflowing).toBe(false);
  });

  test("has no serious or critical accessibility violations after reveal", async ({ page }) => {
    await page.getByRole("radio", { name: predictionOption }).check();
    await page.getByLabel("Rationale").fill("The long-run mix reveals balanced aggregate flows.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    await page.getByRole("region", { name: "Observation unlocked" }).waitFor();

    const results = await new AxeBuilder({ page }).analyze();
    const seriousOrCritical = results.violations.filter(
      (violation) => violation.impact === "critical" || violation.impact === "serious",
    );
    expect(seriousOrCritical).toEqual([]);
  });
});
