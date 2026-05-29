import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { expectProductSimulationReveal } from "../../../../../../testing/sim-harness/src/playwright-contract.js";

test.describe("Graph Search and Shortest Paths", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/?sim=sutd/csd/graph-search-and-shortest-paths/graph-search-and-shortest-paths");
  });

  test("satisfies the product reveal visual contract", async ({ page }) => {
    await expectProductSimulationReveal(page, {
      simId: "sutd/csd/graph-search-and-shortest-paths/graph-search-and-shortest-paths",
      setup: [
        { role: "button", name: "Choose traversal" },
        { role: "button", name: "Reveal graph evidence" },
      ],
      prediction: {
        optionLabel: "BFS minimizes edge count; Dijkstra minimizes total non-negative weight.",
        rationale: "BFS treats every edge as one step, while Dijkstra sums edge weights.",
      },
    });
  });

  test("prediction-checkpoint keeps observation visible while saving reflection", async ({ page }) => {

    {

      const setupButton = page.getByRole("button", { name: "Choose traversal" });

      if ((await setupButton.count()) > 0) {

        await setupButton.first().click();

      }

    }
    await page.getByRole("button", { name: "Reveal graph evidence" }).click();

    await expect(page.getByRole("form", { name: "Prediction checkpoint" })).toBeVisible();

    await page
      .getByLabel("BFS minimizes edge count; Dijkstra minimizes total non-negative weight.")
      .check();
    await page
      .getByLabel("Rationale")
      .fill("BFS treats every edge as one step, while Dijkstra sums the weights.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    await expect(page.getByText("Dijkstra weighted shortest path")).toBeVisible();
  });

  test("manipulate traversal mode changes the observed order", async ({ page }) => {
    {
      const setupButton = page.getByRole("button", { name: "Choose traversal" });
      if ((await setupButton.count()) > 0) {
        await setupButton.first().click();
      }
    }
    await page.getByLabel("DFS traversal").check();
    await page.getByRole("button", { name: "Reveal graph evidence" }).click();
    await page
      .getByLabel("BFS minimizes edge count; Dijkstra minimizes total non-negative weight.")
      .check();
    await page.getByLabel("Rationale").fill("DFS explores one branch before the next.");
    await page.getByRole("button", { name: "Commit prediction" }).click();

    const observation = page.getByRole("region", { name: "Observation unlocked" });
    await expect(observation).toContainText("Traversal mode: DFS");
    await expect(observation).toContainText("Traversal order from node A: A → B → D → F → E → C");
  });

  test("has no critical accessibility violations after reveal", async ({ page }) => {
    {
      const setupButton = page.getByRole("button", { name: "Choose traversal" });
      if ((await setupButton.count()) > 0) {
        await setupButton.first().click();
      }
    }
    await page.getByRole("button", { name: "Reveal graph evidence" }).click();
    await page
      .getByLabel("BFS minimizes edge count; Dijkstra minimizes total non-negative weight.")
      .check();
    await page
      .getByLabel("Rationale")
      .fill("Weighted shortest path and unweighted traversal answer different questions.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    await page.getByRole("region", { name: "Observation unlocked" }).waitFor();

    const results = await new AxeBuilder({ page }).analyze();
    const criticalViolations = results.violations.filter(
      (violation) => violation.impact === "critical",
    );

    expect(criticalViolations).toEqual([]);
  });
});
