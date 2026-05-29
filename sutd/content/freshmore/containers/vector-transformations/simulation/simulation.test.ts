import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { expectProductSimulationReveal } from "../../../../../../testing/sim-harness/src/playwright-contract.js";

test.describe("Vector Transformations", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/?sim=sutd/freshmore/vector-transformations/vector-transformations");
  });

  test("satisfies the product reveal visual contract", async ({ page }) => {
    await expectProductSimulationReveal(page, {
      simId: "sutd/freshmore/vector-transformations/vector-transformations",
      setup: [
        { role: "button", name: "Set up transformation" },
        { role: "button", name: "Reveal transformed vector" },
      ],
      prediction: {
        optionLabel: "x = 3",
        rationale: "The first coordinate is 2(1) + 1(1) = 3.",
      },
    });
  });

  test("prediction-gate blocks transformation evidence until commit", async ({ page }) => {
    await expect(page.getByRole("region", { name: "Observation unlocked" })).toHaveCount(0);

    await page.getByRole("button", { name: "Set up transformation" }).click();
    await page.getByRole("button", { name: "Reveal transformed vector" }).click();

    await expect(page.getByRole("form", { name: "Prediction gate" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Observation unlocked" })).toHaveCount(0);

    await page.getByRole("radio", { name: "x = 3" }).check();
    await page.getByLabel("Rationale").fill("The x-coordinate is 2(1) + 1(1) = 3.");
    await page.getByRole("button", { name: "Commit prediction" }).click();

    const observation = page.getByRole("region", { name: "Observation unlocked" });
    await expect(observation).toBeVisible();
    await expect(observation).toContainText("T(1, 1) = (3, 1)");
    await expect(observation).toContainText("Formula used: x' = (2)(1) + (1)(1) = 3");
  });

  test("manipulation changes the transformed vector", async ({ page }) => {
    await page.getByRole("button", { name: "Set up transformation" }).click();
    await page.getByRole("slider", { name: "Basis e2 x output" }).fill("2");
    await page.getByRole("button", { name: "Reveal transformed vector" }).click();

    await page.getByRole("radio", { name: "x = 4" }).check();
    await page
      .getByLabel("Rationale")
      .fill("Changing the e2 x-output makes x' = 2(1) + 2(1) = 4.");
    await page.getByRole("button", { name: "Commit prediction" }).click();

    const observation = page.getByRole("region", { name: "Observation unlocked" });
    await expect(observation).toContainText("T(1, 1) = (4, 1)");
    await expect(observation).toContainText("Area scale = det(A)");
  });

  test("has no critical accessibility violations after reveal", async ({ page }) => {
    await page.getByRole("button", { name: "Set up transformation" }).click();
    await page.getByRole("button", { name: "Reveal transformed vector" }).click();
    await page.getByRole("radio", { name: "x = 3" }).check();
    await page.getByLabel("Rationale").fill("The first coordinate combines the two column moves.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    await page.getByRole("region", { name: "Observation unlocked" }).waitFor();

    const results = await new AxeBuilder({ page }).analyze();
    const criticalViolations = results.violations.filter(
      (violation) => violation.impact === "critical",
    );

    expect(criticalViolations).toEqual([]);
  });
});
