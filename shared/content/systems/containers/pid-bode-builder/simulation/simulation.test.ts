import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { expectProductSimulationReveal } from "../../../../../../testing/sim-harness/src/playwright-contract.js";

test.describe("Shared PID Bode Builder", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/?sim=shared/systems/pid-bode-builder/pid-bode-builder");
  });

  test("satisfies the product reveal visual contract", async ({ page }) => {
    await expectProductSimulationReveal(page, {
      simId: "shared/systems/pid-bode-builder/pid-bode-builder",
      setup: [
        { role: "button", name: "Start PID tuning" },
        { role: "button", name: "Reveal response and Bode evidence" },
      ],
      prediction: {
        optionLabel: "The response can get faster, but the phase margin may shrink.",
        rationale: "Higher gain can move crossover to more phase lag.",
      },
    });
  });

  test("prediction-checkpoint keeps PID and Bode evidence visible while saving reflection", async ({ page }) => {
    {
      const setupButton = page.getByRole("button", { name: "Start PID tuning" });
      if ((await setupButton.count()) > 0) {
        await setupButton.first().click();
      }
    }
    await page.getByRole("button", { name: "Reveal response and Bode evidence" }).click();

    await expect(page.getByRole("form", { name: "Prediction checkpoint" })).toBeVisible();

    await page.getByRole("radio", { name: "The response can get faster" }).check();
    await page.getByLabel("Rationale").fill("Higher gain can move crossover to more phase lag.");
    await page.getByRole("button", { name: "Commit prediction" }).click();

    const observation = page.getByLabel("Observation unlocked");
    await expect(observation).toContainText("Closed-loop and Bode evidence");
    await expect(page.getByLabel("Formula used")).toContainText("T(s)");
    await expect(page.getByLabel("Formula legend")).toContainText("phase margin");
  });

  test("manipulation changes visible response metrics", async ({ page }) => {
    {
      const setupButton = page.getByRole("button", { name: "Start PID tuning" });
      if ((await setupButton.count()) > 0) {
        await setupButton.first().click();
      }
    }
    await page.getByRole("slider", { name: "Proportional gain Kp" }).fill("3.2");
    await page.getByRole("button", { name: "Reveal response and Bode evidence" }).click();
    await page.getByRole("radio", { name: "The response can get faster" }).check();
    await page.getByLabel("Rationale").fill("More proportional gain usually speeds the loop.");
    await page.getByRole("button", { name: "Commit prediction" }).click();

    await expect(page.getByLabel("Observation unlocked")).toContainText("Kp = 3.20");
  });

  test("shows charts, formula panel, substitutions, units, and interpretation", async ({ page }) => {
    {
      const setupButton = page.getByRole("button", { name: "Start PID tuning" });
      if ((await setupButton.count()) > 0) {
        await setupButton.first().click();
      }
    }
    await page.getByRole("button", { name: "Reveal response and Bode evidence" }).click();
    await page.getByRole("radio", { name: "The response can get faster" }).check();
    await page.getByLabel("Rationale").fill("The phase margin can shrink at a higher crossover.");
    await page.getByRole("button", { name: "Commit prediction" }).click();

    await expect(
      page.getByRole("img", { name: "Step response chart, output against time in seconds" }),
    ).toBeVisible();
    await expect(
      page.getByRole("img", {
        name: "Magnitude response chart, decibels against frequency in radians per second",
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("img", {
        name: "Phase response chart, degrees against frequency in radians per second",
      }),
    ).toBeVisible();
    await expect(page.getByLabel("Formula used")).toContainText("Substitution");
    await expect(page.getByLabel("Formula used")).toContainText("rad/s");
    await expect(page.getByLabel("Formula used")).toContainText("Result:");
  });

  test("has no serious accessibility violations after reveal", async ({ page }) => {
    {
      const setupButton = page.getByRole("button", { name: "Start PID tuning" });
      if ((await setupButton.count()) > 0) {
        await setupButton.first().click();
      }
    }
    await page.getByRole("button", { name: "Reveal response and Bode evidence" }).click();
    await page.getByRole("radio", { name: "The response can get faster" }).check();
    await page.getByLabel("Rationale").fill("Robustness depends on phase at crossover.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    await page.getByLabel("Observation unlocked").waitFor();

    const results = await new AxeBuilder({ page }).analyze();
    const seriousOrCritical = results.violations.filter(
      (violation) => violation.impact === "critical" || violation.impact === "serious",
    );

    expect(seriousOrCritical).toEqual([]);
  });
});
