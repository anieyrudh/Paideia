import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { expectProductSimulationReveal } from "../../../../../../testing/sim-harness/src/playwright-contract.js";

test.describe("Circuit Phasor Lab", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/?sim=shared/physics/circuit-phasor-reasoning/circuit-phasor-lab");
  });

  test("satisfies the product reveal visual contract", async ({ page }) => {
    await expectProductSimulationReveal(page, {
      simId: "shared/physics/circuit-phasor-reasoning/circuit-phasor-lab",
      prediction: {
        optionLabel: "Current lags the voltage because the inductor adds positive reactance.",
        rationale: "The inductor adds positive reactance, so current phase is negative.",
      },
    });
  });

  test("prediction-gate blocks phasor reveal until commit", async ({ page }) => {
    await expect(page.getByLabel("Observation unlocked")).toHaveCount(0);
    await expect(page.getByRole("form", { name: "Prediction gate" })).toBeVisible();
    await expect(page.getByText("Formula used")).toHaveCount(0);

    await page.getByRole("radio", { name: "Current lags the voltage because the inductor adds positive reactance." }).check();
    await page.getByLabel("Rationale").fill("The inductor adds positive reactance, so current phase is negative.");
    await page.getByRole("button", { name: "Commit prediction" }).click();

    await expect(page.getByLabel("Observation unlocked")).toBeVisible();
    await expect(page.getByText("Formula used")).toBeVisible();
  });

  test("capacitive preset changes the visible phase interpretation", async ({ page }) => {
    await page.getByRole("radio", { name: "Current lags the voltage because the inductor adds positive reactance." }).check();
    await page.getByLabel("Rationale").fill("I want to compare the sign of net reactance after reveal.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    await page.getByRole("button", { name: "capacitive" }).click();

    const observation = page.getByLabel("Observation unlocked");
    await expect(observation).toContainText("capacitive");
    await expect(observation).toContainText("degrees");
  });

  test("has no serious accessibility violations after reveal", async ({ page }) => {
    await page.getByRole("radio", { name: "Current lags the voltage because the inductor adds positive reactance." }).check();
    await page.getByLabel("Rationale").fill("The phasor sign determines whether current leads or lags.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    await page.getByLabel("Observation unlocked").waitFor();

    const results = await new AxeBuilder({ page }).analyze();
    const seriousOrCritical = results.violations.filter(
      (violation) => violation.impact === "critical" || violation.impact === "serious",
    );

    expect(seriousOrCritical).toEqual([]);
  });

  test("shows the formula standard after reveal", async ({ page }) => {
    await page.getByRole("radio", { name: "Current lags the voltage because the inductor adds positive reactance." }).check();
    await page.getByLabel("Rationale").fill("Reactance changes the impedance angle.");
    await page.getByRole("button", { name: "Commit prediction" }).click();

    await expect(page.getByLabel("Formula used")).toContainText("\\color{#6941c6}{Z}");
    await expect(page.getByLabel("Formula legend")).toContainText("series impedance vector");
    await expect(page.getByLabel("Formula used")).toContainText("Substitution: reactance");
    await expect(page.getByLabel("Formula used")).toContainText("Result:");
    await expect(page.getByLabel("Formula used")).toContainText("series AC circuit carries one current");
  });
});
