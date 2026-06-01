import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { expectProductSimulationReveal } from "../../../../../../testing/sim-harness/src/playwright-contract.js";

const simId = "sutd/10-022-modelling-uncertainty/conditional-probability-and-bayes/conditional-probability-and-bayes";

test.describe("Conditional Probability and Bayes", () => {
  test("satisfies the product reveal visual contract", async ({ page }) => {
    await expectProductSimulationReveal(page, {
      simId,
      setup: [
        { role: "button", name: "Set up Bayes scenario" },
        { role: "button", name: "Reveal posterior" },
      ],
      prediction: {
        optionLabel: "51.4%",
        rationale: "Bayes combines a 10% prior with a 95% sensitivity and 10% false-positive rate.",
      },
    });
  });

  test.beforeEach(async ({ page }) => {
    await page.goto("/?sim=sutd/10-022-modelling-uncertainty/conditional-probability-and-bayes/conditional-probability-and-bayes");
  });

  test("prediction-checkpoint keeps posterior visible while saving reflection", async ({ page }) => {
    {
      const setupButton = page.getByRole("button", { name: "Set up Bayes scenario" });
      if ((await setupButton.count()) > 0) {
        await setupButton.first().click();
      }
    }
    await page.getByRole("button", { name: "Reveal posterior" }).click();
    await expect(page.getByRole("form", { name: "Prediction checkpoint" })).toBeVisible();

    await page.getByRole("radio", { name: "51.4%" }).check();
    await page.getByLabel("Rationale").fill("Bayes combines prior and test quality.");
    await page.getByRole("button", { name: "Commit prediction" }).click();

    await expect(page.getByRole("region", { name: "Observation unlocked" })).toContainText("Conditional probability and Bayes evidence");
    await expect(
      page.getByRole("img", {
        name: "Bayes evidence flow: true positives and false positives normalized into posterior",
      }),
    ).toBeVisible();
    await expect(page.getByLabel("Formula used")).toContainText("P(H \\mid +)");
    await expect(page.getByLabel("Formula legend")).toContainText("prior prevalence");
    await expect(page.getByRole("region", { name: "Observation unlocked" })).toContainText("Substitution");
  });

  test("manipulation changes posterior", async ({ page }) => {
    {
      const setupButton = page.getByRole("button", { name: "Set up Bayes scenario" });
      if ((await setupButton.count()) > 0) {
        await setupButton.first().click();
      }
    }
    await page.getByRole("slider", { name: "Prior prevalence P(H)" }).fill("30");
    await page.getByRole("button", { name: "Reveal posterior" }).click();
    await page.getByRole("radio", { name: "90.0%" }).check();
    await page.getByLabel("Rationale").fill("Higher prior increases posterior.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    await expect(page.getByRole("region", { name: "Observation unlocked" })).toContainText("Posterior after +");
    await expect(page.getByRole("region", { name: "Observation unlocked" })).toContainText("80.3%");
  });

  test("has no critical accessibility violations after reveal", async ({ page }) => {
    {
      const setupButton = page.getByRole("button", { name: "Set up Bayes scenario" });
      if ((await setupButton.count()) > 0) {
        await setupButton.first().click();
      }
    }
    await page.getByRole("button", { name: "Reveal posterior" }).click();
    await page.getByRole("radio", { name: "51.4%" }).check();
    await page.getByLabel("Rationale").fill("Posterior must include base rate.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    await page.getByRole("region", { name: "Observation unlocked" }).waitFor();

    const results = await new AxeBuilder({ page }).analyze();
    const seriousOrCritical = results.violations.filter(
      (violation) => violation.impact === "critical" || violation.impact === "serious",
    );
    expect(seriousOrCritical).toEqual([]);
  });
});
