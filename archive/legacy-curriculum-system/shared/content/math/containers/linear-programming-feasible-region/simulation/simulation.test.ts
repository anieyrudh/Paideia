import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { expectProductSimulationReveal } from "../../../../../../testing/sim-harness/src/playwright-contract.js";

test.describe("LP Feasible Region Visualiser", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/?sim=shared/math/linear-programming-feasible-region/lp-feasible-region");
  });

  test("satisfies the product reveal visual contract", async ({ page }) => {
    await expectProductSimulationReveal(page, {
      simId: "shared/math/linear-programming-feasible-region/lp-feasible-region",
      prediction: {
        optionLabel: "Check every feasible corner, because a linear objective reaches its best value at a boundary vertex",
        rationale: "A linear objective is compared at feasible vertices.",
      },
    });
  });

  test("prediction-checkpoint keeps feasible-region reveal visible while saving reflection", async ({ page }) => {
    await expect(page.getByRole("form", { name: "Prediction checkpoint" })).toBeVisible();

    await page
      .getByRole("radio", {
        name: "Check every feasible corner, because a linear objective reaches its best value at a boundary vertex",
      })
      .check();
    await page.getByLabel("Rationale").fill("A linear objective is compared at feasible vertices.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    await expect(page.getByLabel("Feasible region and objective line")).toBeVisible();
    await expect(page.getByLabel("Formula used")).toContainText("Z");
  });

  test("main controls change the visible feasible-region state", async ({ page }) => {
    await page
      .getByRole("radio", {
        name: "Check every feasible corner, because a linear objective reaches its best value at a boundary vertex",
      })
      .check();
    await page.getByLabel("Rationale").fill("The boundary vertices are the candidates.");
    await page.getByRole("button", { name: "Commit prediction" }).click();

    await expect(page.getByLabel("Observation unlocked")).toContainText("(6, 2)");
    await page.getByRole("button", { name: "infeasible test" }).click();
    await expect(page.getByLabel("Constraint substitutions")).toContainText("violated");
  });

  test("has no serious accessibility violations after reveal", async ({ page }) => {
    await page
      .getByRole("radio", {
        name: "Check every feasible corner, because a linear objective reaches its best value at a boundary vertex",
      })
      .check();
    await page.getByLabel("Rationale").fill("Feasible vertices define the search set.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    await page.getByLabel("Observation unlocked").waitFor();

    const results = await new AxeBuilder({ page }).analyze();
    const seriousOrCritical = results.violations.filter(
      (violation) => violation.impact === "critical" || violation.impact === "serious",
    );

    expect(seriousOrCritical).toEqual([]);
  });

  test("shows formula, legend, substitution, units, and interpretation", async ({ page }) => {
    await page
      .getByRole("radio", {
        name: "Check every feasible corner, because a linear objective reaches its best value at a boundary vertex",
      })
      .check();
    await page.getByLabel("Rationale").fill("Objective lines sweep until the last feasible contact.");
    await page.getByRole("button", { name: "Commit prediction" }).click();

    await expect(page.getByLabel("Formula", { exact: true })).toContainText("Z");
    await expect(page.getByLabel("Formula legend")).toContainText("profit per x batch");
    await expect(page.getByLabel("Formula used")).toContainText("Substitution: optimum");
    await expect(page.getByLabel("Formula used")).toContainText("profit-units");
    await expect(page.getByLabel("Observation unlocked")).toContainText("optimum at a corner");
  });
});
