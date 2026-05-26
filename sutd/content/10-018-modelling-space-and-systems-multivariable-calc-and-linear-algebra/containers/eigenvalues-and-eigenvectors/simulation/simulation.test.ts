import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("Eigenvalues and Eigenvectors", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(
      "/?sim=sutd/10-018-modelling-space-and-systems-multivariable-calc-and-linear-algebra/eigenvalues-and-eigenvectors/eigenvalues-and-eigenvectors",
    );
  });

  test("prediction-gate blocks eigenvalue evidence until commit", async ({ page }) => {
    await expect(page.getByRole("region", { name: "Observation unlocked" })).toHaveCount(0);

    await page.getByRole("button", { name: "Set up eigenvalue check" }).click();
    await page.getByRole("button", { name: "Reveal eigenvalue evidence" }).click();

    await expect(page.getByRole("form", { name: "Prediction gate" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Observation unlocked" })).toHaveCount(0);

    await page
      .getByRole("radio", {
        name: "lambda = 3 and lambda = 2 (the diagonal entries, because A is upper-triangular)",
      })
      .check();
    await page.getByLabel("Rationale").fill("Upper-triangular matrices have diagonal eigenvalues.");
    await page.getByRole("button", { name: "Commit prediction" }).click();

    const observation = page.getByRole("region", { name: "Observation unlocked" });
    await expect(observation).toBeVisible();
    await expect(observation).toContainText("Eigenvalue evidence");
    await expect(observation).toContainText("lambda_1 = 3");
    await expect(observation).toContainText("lambda_2 = 2");
    await expect(page.getByLabel("LaTeX formula source")).toContainText("lambda^2");
    await expect(page.getByLabel("Formula legend")).toContainText("discriminant");
  });

  test("manipulation reveals complex conjugate eigenvalues", async ({ page }) => {
    await page.getByRole("button", { name: "Set up eigenvalue check" }).click();
    await page.getByRole("slider", { name: "Top-left entry a" }).fill("0");
    await page.getByRole("slider", { name: "Top-right entry b" }).fill("-1");
    await page.getByRole("slider", { name: "Bottom-left entry c" }).fill("1");
    await page.getByRole("slider", { name: "Bottom-right entry d" }).fill("0");
    await page.getByRole("button", { name: "Reveal eigenvalue evidence" }).click();
    await expect(page.getByRole("region", { name: "Observation unlocked" })).toHaveCount(0);
    await page
      .getByRole("radio", {
        name: "lambda = 1 + i and lambda = 1 - i (complex conjugates)",
      })
      .check();
    await page.getByLabel("Rationale").fill("A rotation has complex eigenvalues.");
    await page.getByRole("button", { name: "Commit prediction" }).click();

    const observation = page.getByRole("region", { name: "Observation unlocked" });
    await expect(observation).toContainText("complex conjugate eigenvalues");
    await expect(observation).toContainText("no real invariant line");
  });

  test("has no serious accessibility violations after reveal", async ({ page }) => {
    await page.getByRole("button", { name: "Set up eigenvalue check" }).click();
    await page.getByRole("button", { name: "Reveal eigenvalue evidence" }).click();
    await expect(page.getByRole("region", { name: "Observation unlocked" })).toHaveCount(0);
    await page
      .getByRole("radio", {
        name: "lambda = 3 and lambda = 2 (the diagonal entries, because A is upper-triangular)",
      })
      .check();
    await page.getByLabel("Rationale").fill("Roots of lambda^2 - 5 lambda + 6 = 0.");
    await page.getByRole("button", { name: "Commit prediction" }).click();
    await page.getByRole("region", { name: "Observation unlocked" }).waitFor();

    const results = await new AxeBuilder({ page }).analyze();
    const seriousOrCritical = results.violations.filter(
      (violation) => violation.impact === "critical" || violation.impact === "serious",
    );

    expect(seriousOrCritical).toEqual([]);
  });
});
