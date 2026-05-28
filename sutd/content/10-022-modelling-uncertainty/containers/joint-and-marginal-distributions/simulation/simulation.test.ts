import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const route =
  "/?sim=sutd/10-022-modelling-uncertainty/joint-and-marginal-distributions/joint-table-lab";

test.describe("Joint and Marginal Distributions", () => {
  test("prediction-gate blocks joint table evidence until commit", async ({ page }) => {
    await page.goto(route);

    await expect(page.getByRole("region", { name: "Observation unlocked" })).toHaveCount(0);
    await expect(page.getByText("P(A|B)")).toHaveCount(0);
    await page.getByLabel("It is higher than P(A)").check();
    await page.getByLabel("Rationale").fill("Positive association raises the conditional rate.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    await page.getByRole("button", { name: "Build table" }).click();

    await expect(page.getByText("Commit a prediction to reveal joint cells, marginals, and conditional probability.")).toBeVisible();
    await page.getByRole("button", { name: "Reveal marginals" }).click();
    await expect(page.getByRole("region", { name: "Observation unlocked" })).toBeVisible();
  });

  test("association manipulation changes the visible conditional", async ({ page }) => {
    await page.goto(route);

    await page.getByLabel("It is higher than P(A)").check();
    await page.getByLabel("Rationale").fill("Positive association lifts the B column.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    await page.getByRole("button", { name: "Build table" }).click();
    await page.getByLabel("Association").fill("0.8");
    await page.getByRole("button", { name: "Reveal marginals" }).click();

    await expect(page.getByText("P(A|B)=P(A and B)/P(B)")).toBeVisible();
    await expect(page.getByText("Seeing B raises A")).toBeVisible();
  });

  test("has no serious accessibility violations after reveal", async ({ page }) => {
    await page.goto(route);

    await page.getByLabel("It is higher than P(A)").check();
    await page.getByLabel("Rationale").fill("Positive association lifts the conditional.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    await page.getByRole("button", { name: "Build table" }).click();
    await page.getByRole("button", { name: "Reveal marginals" }).click();

    const results = await new AxeBuilder({ page }).analyze();
    expect(
      results.violations.filter(
        (violation) => violation.impact === "serious" || violation.impact === "critical",
      ),
    ).toEqual([]);
  });
});
