import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("Markov Chain Steady State", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => window.localStorage.clear());
    await page.goto("/?sim=sutd/esd/markov-chain-steady-state/markov-chain-steady-state");
  });

  test("prediction-gate blocks steady-state evidence until commit", async ({ page }) => {
    await expect(page.getByRole("region", { name: "Observation unlocked" })).toHaveCount(0);
    await page.getByRole("button", { name: "Set transition matrix" }).click();
    await expect(page.getByRole("table", { name: "Transition matrix" })).toContainText(
      "Smooth next",
    );
    await page.getByRole("button", { name: "Reveal steady state" }).click();

    await expect(page.getByRole("form", { name: "Prediction gate" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Observation unlocked" })).toHaveCount(0);

    await page.getByRole("radio", { name: "Toward more congested weeks" }).check();
    await page
      .getByLabel("Rationale")
      .fill("Weak recovery means congestion keeps receiving enough long-run probability mass.");
    await page.getByRole("button", { name: "Commit prediction" }).click();

    await expect(page.getByRole("region", { name: "Observation unlocked" })).toBeVisible();
    await expect(page.getByLabel("Formula evidence")).toContainText("pi_S = b");
    await expect(page.getByLabel("Formula legend")).toContainText("probability per week");
    await expect(page.getByRole("table", { name: "State trajectory" })).toContainText("Week");
  });

  test("manipulation changes the visible steady-state recommendation", async ({ page }) => {
    await page.getByRole("button", { name: "Set transition matrix" }).click();
    await page.getByRole("button", { name: "fast recovery" }).click();
    await page.getByRole("button", { name: "Reveal steady state" }).click();
    await page.getByRole("radio", { name: "Toward more smooth weeks" }).check();
    await page
      .getByLabel("Rationale")
      .fill("Fast recovery from congestion should increase the smooth long-run share.");
    await page.getByRole("button", { name: "Commit prediction" }).click();

    await expect(page.getByRole("region", { name: "Observation unlocked" })).toContainText(
      "82.9%",
    );
    await expect(page.getByRole("region", { name: "Observation unlocked" })).toContainText(
      "17.1%",
    );
  });

  test("formula, substitution, units, interpretation, and legend are shown together", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Set transition matrix" }).click();
    await page.getByRole("button", { name: "Reveal steady state" }).click();
    await page.getByRole("radio", { name: "Toward more congested weeks" }).check();
    await page.getByLabel("Rationale").fill("I will compare recovery with deterioration.");
    await page.getByRole("button", { name: "Commit prediction" }).click();

    await expect(page.getByLabel("Formula used")).toContainText("x_(t+1) = P x_t");
    await expect(page.getByLabel("Formula legend")).toContainText("pi");
    await expect(page.getByLabel("Formula evidence")).toContainText("Substitution");
    await expect(page.getByLabel("Formula evidence")).toContainText("per week");
    await expect(page.getByLabel("Formula evidence")).toContainText("Interpretation");
    await expect(page.getByLabel("Convergence chart")).toContainText(
      "State mix over repeated weeks",
    );

    await page.setViewportSize({ width: 390, height: 780 });
    const overflowing = await page
      .getByLabel("Formula evidence")
      .evaluate((element) => element.scrollWidth > element.clientWidth + 1);
    expect(overflowing).toBe(false);
  });

  test("has no serious or critical accessibility violations after reveal", async ({ page }) => {
    await page.getByRole("button", { name: "Set transition matrix" }).click();
    await page.getByRole("button", { name: "Reveal steady state" }).click();
    await page.getByRole("radio", { name: "Toward more congested weeks" }).check();
    await page
      .getByLabel("Rationale")
      .fill("The long-run mix should reveal the balanced aggregate flows.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    await page.getByRole("region", { name: "Observation unlocked" }).waitFor();

    const results = await new AxeBuilder({ page }).analyze();
    const seriousOrCritical = results.violations.filter(
      (violation) => violation.impact === "critical" || violation.impact === "serious",
    );
    expect(seriousOrCritical).toEqual([]);
  });
});
