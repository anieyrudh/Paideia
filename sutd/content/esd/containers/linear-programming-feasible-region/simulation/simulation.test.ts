import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { expectProductSimulationReveal } from "../../../../../../testing/sim-harness/src/playwright-contract.js";

test.describe("Linear Programming Feasible Region", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/?sim=sutd/esd/linear-programming-feasible-region/linear-programming-feasible-region");
  });

  test("satisfies the product reveal visual contract", async ({ page }) => {
    await expectProductSimulationReveal(page, {
      simId: "sutd/esd/linear-programming-feasible-region/linear-programming-feasible-region",
      setup: [
        { role: "button", name: "Start manipulating" },
        { role: "button", name: "Observe this point" },
      ],
      prediction: {
        optionLabel: "(4, 4)",
        rationale: "A feasible corner should be tested against every constraint.",
      },
    });
  });

  test("prediction-checkpoint keeps observation visible while saving reflection", async ({ page }) => {

    {

      const setupButton = page.getByRole("button", { name: "Start manipulating" });

      if ((await setupButton.count()) > 0) {

        await setupButton.first().click();

      }

    }
    await page.getByRole("button", { name: "Observe this point" }).click();

    await expect(page.getByRole("form", { name: "Prediction checkpoint" })).toBeVisible();

    await page.getByLabel("(4, 4)").check();
    await page
      .getByLabel("Rationale")
      .fill("Corner points are where the objective is worth checking first.");
    await page.getByRole("button", { name: "Commit prediction" }).click();

    const observation = page.getByRole("region", { name: "Observation unlocked" });
    await expect(observation).toBeVisible();
    await expect(observation.getByText("Z = 3x + 2y =")).toBeVisible();
  });

  test("manipulate controls write to kernel state", async ({ page }) => {
    {
      const setupButton = page.getByRole("button", { name: "Start manipulating" });
      if ((await setupButton.count()) > 0) {
        await setupButton.first().click();
      }
    }

    await page.getByLabel("x units").focus();
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    await page.getByLabel("y units").focus();
    await page.keyboard.press("ArrowRight");
    await page.getByRole("button", { name: "Observe this point" }).click();
    await page.getByLabel("(4, 4)").check();
    await page.getByLabel("Rationale").fill("I want to test the substituted constraints.");
    await page.getByRole("button", { name: "Commit prediction" }).click();

    await expect(page.getByRole("region", { name: "Observation unlocked" })).toContainText(
      "x + y = 4 + 3 = 7",
    );
    await expect(page.getByRole("region", { name: "Observation unlocked" })).toContainText(
      "Z = 3x + 2y = 3(4) + 2(3) = 18",
    );
  });

  test("has no critical accessibility violations after reveal", async ({ page }) => {
    {
      const setupButton = page.getByRole("button", { name: "Start manipulating" });
      if ((await setupButton.count()) > 0) {
        await setupButton.first().click();
      }
    }
    await page.getByRole("button", { name: "Observe this point" }).click();
    await page.getByLabel("(4, 4)").check();
    await page
      .getByLabel("Rationale")
      .fill("A feasible corner should be tested against every constraint.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    await page.getByRole("region", { name: "Observation unlocked" }).waitFor();

    const results = await new AxeBuilder({ page }).analyze();
    const criticalViolations = results.violations.filter(
      (violation) => violation.impact === "critical",
    );

    expect(criticalViolations).toEqual([]);
  });
});
