import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("has no critical accessibility violations on the first shell screen", async ({ page }) => {
  await page.goto("/");

  const results = await new AxeBuilder({ page }).analyze();
  const criticalViolations = results.violations.filter(
    (violation) => violation.impact === "critical",
  );

  expect(criticalViolations).toEqual([]);
});

test("has no critical accessibility violations after the physical-quantities sim is revealed", async ({
  page,
}) => {
  await page.goto("/#a-level/physics/physical-quantities-and-units");

  await page.getByLabel("2.50 m s^-1 ± 0.09 m s^-1").check();
  await page
    .getByLabel("Rationale")
    .fill("A complete measured speed needs the value, derived unit, and uncertainty.");
  await page.getByRole("button", { name: "Commit prediction" }).click();
  await page.getByLabel("Observation unlocked").waitFor();

  const results = await new AxeBuilder({ page }).analyze();
  const criticalViolations = results.violations.filter(
    (violation) => violation.impact === "critical",
  );

  expect(criticalViolations).toEqual([]);
});

test("does not leak the physical-quantities prediction answer before commit", async ({ page }) => {
  await page.goto("/#a-level/physics/physical-quantities-and-units");

  await expect(page.getByRole("form", { name: "Prediction gate" })).toBeVisible();
  await expect(page.getByLabel("Formula and unit reasoning")).toHaveCount(0);
  await expect(page.getByText("v = 2.50 ± 0.09 m s^-1")).toHaveCount(0);
  await expect(page.getByText("2.50 ± 0.09 m s^-1 is a derived scalar measurement")).toHaveCount(0);
});

test("has no critical accessibility violations after the scalars-and-vectors sim is revealed", async ({
  page,
}) => {
  await page.goto("/#a-level/physics/scalars-and-vectors");

  await page.getByLabel("7.1 m").check();
  await page
    .getByLabel("Rationale")
    .fill("Perpendicular arrows should form a right triangle, not a straight line.");
  await page.getByRole("button", { name: "Commit prediction" }).click();
  await page.getByLabel("Observation unlocked").waitFor();

  const results = await new AxeBuilder({ page }).analyze();
  const criticalViolations = results.violations.filter(
    (violation) => violation.impact === "critical",
  );

  expect(criticalViolations).toEqual([]);
});

test("has no critical accessibility violations after the resolving-vectors sim is revealed", async ({
  page,
}) => {
  await page.goto("/#a-level/physics/resolving-vectors");

  await page.getByLabel("8.7 N").check();
  await page
    .getByLabel("Rationale")
    .fill("The horizontal component is adjacent to the 30 degree angle, so cosine applies.");
  await page.getByRole("button", { name: "Commit prediction" }).click();
  await page.getByLabel("Observation unlocked").waitFor();

  const results = await new AxeBuilder({ page }).analyze();
  const criticalViolations = results.violations.filter(
    (violation) => violation.impact === "critical",
  );

  expect(criticalViolations).toEqual([]);
});
