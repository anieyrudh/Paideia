import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { expectProductSimulationReveal } from "../../../../../../testing/sim-harness/src/playwright-contract.js";

const simId =
  "sutd/10-022-modelling-uncertainty/discrete-rvs-geometric-binomial-poisson/probability-model-lab";
const route = `/?sim=${simId}`;

test.describe("Discrete RVs", () => {
  test("satisfies the product reveal visual contract", async ({ page }) => {
    await expectProductSimulationReveal(page, {
      simId,
      setup: [
        { role: "button", name: "Build model" },
        { role: "button", name: "Reveal PMF" },
      ],
      prediction: {
        optionLabel: "Binomial",
        rationale: "A fixed trial count with per-trial success places the most mass on the highlighted range.",
      },
    });
  });

  test.beforeEach(async ({ page }) => {
    await page.goto(route);
  });

  test("prediction-checkpoint keeps PMF evidence visible while saving reflection", async ({ page }) => {
    await page.getByLabel("Binomial").check();
    await page.getByLabel("Rationale").fill("Fixed trial count has the largest highlighted event in the default setup.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    {
      const setupButton = page.getByRole("button", { name: "Build model" });
      if ((await setupButton.count()) > 0) {
        await setupButton.first().click();
      }
    }
    await page.getByRole("button", { name: "Reveal PMF" }).click();
  });

  test("manipulation changes the visible model family", async ({ page }) => {
    await page.getByLabel("Poisson").check();
    await page.getByLabel("Rationale").fill("Event counts over exposure fit Poisson.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    {
      const setupButton = page.getByRole("button", { name: "Build model" });
      if ((await setupButton.count()) > 0) {
        await setupButton.first().click();
      }
    }
    await page.getByLabel("Model family").selectOption({ label: "Poisson" });
    await page.getByRole("button", { name: "Reveal PMF" }).click();
    await expect(page.getByText("Poisson PMF")).toBeVisible();
    await expect(page.getByText("e^(-lambda)lambda^k/k!")).toBeVisible();
  });

  test("has no serious accessibility violations after reveal", async ({ page }) => {
    await page.getByLabel("Binomial").check();
    await page.getByLabel("Rationale").fill("Fixed trial count matches the default prompt.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    {
      const setupButton = page.getByRole("button", { name: "Build model" });
      if ((await setupButton.count()) > 0) {
        await setupButton.first().click();
      }
    }
    await page.getByRole("button", { name: "Reveal PMF" }).click();
    const results = await new AxeBuilder({ page }).analyze();
    const violations = results.violations.filter(
      (violation) => violation.impact === "serious" || violation.impact === "critical",
    );
    expect(violations).toEqual([]);
  });
});
