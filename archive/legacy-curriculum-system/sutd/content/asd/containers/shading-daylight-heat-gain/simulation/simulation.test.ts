import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { expectProductSimulationReveal } from "../../../../../../testing/sim-harness/src/playwright-contract.js";

const simId = "sutd/asd/shading-daylight-heat-gain/shading-daylight-heat-gain";
const route = `/?sim=${simId}`;
const predictionOption =
  "Heat gain falls, but useful daylight can also fall if the shade is too deep.";

test.describe("Shading, Daylight, and Heat Gain", () => {
  test("satisfies the product reveal visual contract", async ({ page }) => {
    await expectProductSimulationReveal(page, {
      simId,
      setup: [],
      prediction: {
        optionLabel: predictionOption,
        rationale: "A deeper overhang shades more glass, reducing direct sun while also lowering daylight.",
      },
    });
  });

  test("prediction-checkpoint keeps tradeoff evidence visible while saving reflection", async ({ page }) => {
    await page.goto(route);

    const observation = page.getByRole("region", { name: "Observation unlocked" });
    await expect(observation).toBeVisible();
    await expect(observation).toContainText("Shading, daylight, and heat evidence");
    await expect(observation).toContainText("Formula trail");
    await expect(observation).toContainText("heat gain = A I SHGC e");
    await expect(page.getByRole("form", { name: "Prediction checkpoint" })).toBeVisible();

    await page.getByRole("radio", { name: predictionOption }).check();
    await page
      .getByLabel("Rationale")
      .fill("A deeper overhang shades more glass, reducing direct sun while also lowering daylight.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    await expect(observation).toBeVisible();
  });

  test("manipulation changes the readout and interpretation", async ({ page }) => {
    await page.goto(route);

    await page.getByRole("button", { name: "hot glass" }).click();

    const observation = page.getByRole("region", { name: "Observation unlocked" });
    await expect(observation).toContainText("15.3 m²");
    await expect(observation).toContainText("direct heat gain is still high");
  });

  test("formula panel keeps legend, substitutions, units, and interpretation visible", async ({ page }) => {
    await page.goto(route);

    const formula = page.getByRole("region", { name: "Formula used" });
    await expect(formula).toContainText("shaded fraction = min");
    await expect(formula).toContainText("overhang depth, m");
    await expect(formula).toContainText("orientation and incidence factor");
    await expect(formula).toContainText("Substitution");
    await expect(formula).toContainText("Units:");
    await expect(formula).toContainText("kW");
    await expect(page.getByRole("region", { name: "Depth tradeoff chart" })).toContainText(
      "Heat gain (kW)",
    );
  });

  test("has no critical or serious accessibility violations after reveal", async ({ page }) => {
    await page.goto(route);

    await page.getByRole("radio", { name: predictionOption }).check();
    await page.getByLabel("Rationale").fill("The prediction commits before the evidence is revealed.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    await page.getByRole("region", { name: "Observation unlocked" }).waitFor();

    const results = await new AxeBuilder({ page }).analyze();
    const seriousOrCriticalViolations = results.violations.filter(
      (violation) => violation.impact === "critical" || violation.impact === "serious",
    );

    expect(seriousOrCriticalViolations).toEqual([]);
  });
});
