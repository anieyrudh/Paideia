import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import {
  expectProductSimulationExperience,
  expectRevealedSimulationVisual,
} from "../../../../../../testing/sim-harness/src/playwright-contract.js";

const route =
  "/?sim=sutd/10-022-modelling-uncertainty/joint-and-marginal-distributions/joint-table-lab";

test.describe("Joint and Marginal Distributions", () => {
  test("satisfies the product reveal visual contract", async ({ page }) => {
    await expectProductSimulationExperience(page, {
      simId: "sutd/10-022-modelling-uncertainty/joint-and-marginal-distributions/joint-table-lab",
      setup: [],
      prediction: {
        optionLabel: "It is higher than P(A)",
        rationale:
          "Positive association concentrates probability into the A-and-B cell, so conditioning on B inflates P(A|B) above the marginal P(A).",
      },
      observation: { observationLabel: "Observation unlocked" },
    });
  });

  test("prediction-checkpoint keeps joint flow evidence visible while saving reflection", async ({ page }) => {
    await page.goto(route);

    await expect(page.getByRole("form", { name: "Prediction checkpoint" })).toBeVisible();
    await expect(
      page.getByRole("img", { name: /Sankey flow from event A or not A to event B or not B/ }),
    ).toBeVisible();
    await expect(page.getByLabel("Formula used")).toContainText("Substitution");
    await expect(page.getByLabel("Formula used")).toContainText("Legend");

    await page.getByLabel("It is higher than P(A)").check();
    await page.getByLabel("Rationale").fill("Positive association raises the conditional rate.");
    await page.getByRole("button", { name: "Commit prediction" }).click();

    await expectRevealedSimulationVisual(page, "Observation unlocked");
  });

  test("association manipulation changes the visible conditional", async ({ page }) => {
    await page.goto(route);

    await page.getByLabel("Association").fill("0.8");

    await expect(page.getByText("P(A|B)=P(A and B)/P(B)")).toBeVisible();
    await expect(page.getByText("Substitution:")).toBeVisible();
    await expect(page.getByText("Seeing B raises A")).toBeVisible();
    await expect(
      page.getByRole("img", { name: /Sankey flow from event A or not A to event B or not B/ }),
    ).toBeVisible();
  });

  test("has no serious accessibility violations after reveal", async ({ page }) => {
    await page.goto(route);

    await page.getByLabel("It is higher than P(A)").check();
    await page.getByLabel("Rationale").fill("Positive association lifts the conditional.");
    await page.getByRole("button", { name: "Commit prediction" }).click();

    const results = await new AxeBuilder({ page }).analyze();
    expect(
      results.violations.filter(
        (violation) => violation.impact === "serious" || violation.impact === "critical",
      ),
    ).toEqual([]);
  });
});
