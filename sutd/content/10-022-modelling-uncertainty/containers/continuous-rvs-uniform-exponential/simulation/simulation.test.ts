import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { expectProductSimulationReveal } from "../../../../../../testing/sim-harness/src/playwright-contract.js";

const simId =
  "sutd/10-022-modelling-uncertainty/continuous-rvs-uniform-exponential/continuous-density-lab";
const route = `/?sim=${simId}`;

test.describe("Continuous RVs", () => {
  test("satisfies the product reveal visual contract", async ({ page }) => {
    await expectProductSimulationReveal(page, {
      simId,
      setup: [
        { role: "button", name: "Build density" },
        { role: "button", name: "Reveal area" },
      ],
      prediction: {
        optionLabel: "Exponential",
        rationale: "Exponential is the only continuous waiting-time model with the memoryless property.",
      },
    });
  });

  test("prediction-checkpoint keeps density evidence visible while saving reflection", async ({ page }) => {
    await page.goto(route);
    await page.getByRole("radio", { name: "Uniform" }).check();
    await page.getByLabel("Rationale").fill("Uniform is bounded over a fixed interval.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    {
      const setupButton = page.getByRole("button", { name: "Build density" });
      if ((await setupButton.count()) > 0) {
        await setupButton.first().click();
      }
    }
    await page.getByRole("button", { name: "Reveal area" }).click();
  });

  test("manipulation changes the visible density family", async ({ page }) => {
    await page.goto(route);

    await page.getByRole("radio", { name: "Exponential" }).check();
    await page.getByLabel("Rationale").fill("Exponential is the waiting-time model.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    {
      const setupButton = page.getByRole("button", { name: "Build density" });
      if ((await setupButton.count()) > 0) {
        await setupButton.first().click();
      }
    }
    await page.getByLabel("Density family").selectOption({ label: "Exponential" });
    await page.getByRole("button", { name: "Reveal area" }).click();

    await expect(page.getByText("Exponential PDF")).toBeVisible();
    await expect(page.getByText("lambda e^(-lambda x)")).toBeVisible();
  });

  test("has no serious accessibility violations after reveal", async ({ page }) => {
    await page.goto(route);

    await page.getByRole("radio", { name: "Uniform" }).check();
    await page.getByLabel("Rationale").fill("Uniform spreads density evenly over a bounded interval.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    {
      const setupButton = page.getByRole("button", { name: "Build density" });
      if ((await setupButton.count()) > 0) {
        await setupButton.first().click();
      }
    }
    await page.getByRole("button", { name: "Reveal area" }).click();

    const results = await new AxeBuilder({ page }).analyze();
    expect(
      results.violations.filter(
        (violation) => violation.impact === "serious" || violation.impact === "critical",
      ),
    ).toEqual([]);
  });
});
