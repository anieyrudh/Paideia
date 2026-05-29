import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { expectProductSimulationReveal } from "../../../../../../testing/sim-harness/src/playwright-contract.js";

test.describe("Graph Algorithm Explorer", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/?sim=shared/cs/graph-algorithm-explorer/graph-algorithm-explorer");
  });

  test("satisfies the product reveal visual contract", async ({ page }) => {
    await expectProductSimulationReveal(page, {
      simId: "shared/cs/graph-algorithm-explorer/graph-algorithm-explorer",
      prediction: {
        optionLabel: "BFS finds the fewest edges, while Dijkstra finds the lowest total weight",
        rationale: "Weights and hop count are different objectives.",
      },
    });
  });

  test("prediction-checkpoint keeps graph evidence visible while saving reflection", async ({ page }) => {
    await expect(page.getByRole("form", { name: "Prediction checkpoint" })).toBeVisible();

    await page
      .getByRole("radio", {
        name: "BFS finds the fewest edges, while Dijkstra finds the lowest total weight",
      })
      .check();
    await page.getByLabel("Rationale").fill("Weights and hop count are different objectives.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    await expect(page.getByLabel("Graph algorithm diagram")).toBeVisible();
    await expect(page.getByText("Formula used")).toBeVisible();
  });

  test("main controls change the visible algorithm evidence", async ({ page }) => {
    await page
      .getByRole("radio", {
        name: "BFS finds the fewest edges, while Dijkstra finds the lowest total weight",
      })
      .check();
    await page.getByLabel("Rationale").fill("The requested objective decides the algorithm.");
    await page.getByRole("button", { name: "Commit prediction" }).click();

    await expect(page.getByLabel("Observation unlocked")).toContainText("fewest-edge");
    await page.getByLabel("Algorithm mode").selectOption({ label: "Dijkstra weighted path" });
    await expect(page.getByLabel("Observation unlocked")).toContainText("lowest-weight");
  });

  test("has no serious accessibility violations after reveal", async ({ page }) => {
    await page
      .getByRole("radio", {
        name: "BFS finds the fewest edges, while Dijkstra finds the lowest total weight",
      })
      .check();
    await page.getByLabel("Rationale").fill("Dijkstra reads non-negative weights.");
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
        name: "BFS finds the fewest edges, while Dijkstra finds the lowest total weight",
      })
      .check();
    await page.getByLabel("Rationale").fill("Path cost is a sum of edge weights.");
    await page.getByRole("button", { name: "Commit prediction" }).click();

    await expect(page.getByLabel("Formula used")).toContainText("cost");
    await expect(page.getByLabel("Formula legend")).toContainText("edge weight");
    await expect(page.getByLabel("Formula used")).toContainText("Substitution: selected path");
    await expect(page.getByLabel("Formula used")).toContainText("weight units");
    await expect(page.getByLabel("Formula used")).toContainText("The formula applies because");
  });
});
