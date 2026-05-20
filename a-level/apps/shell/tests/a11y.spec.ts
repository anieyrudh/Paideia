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

test("has no critical accessibility violations after the kinematics sim is revealed", async ({
  page,
}) => {
  await page.goto("/#a-level/physics/kinematics-in-one-dimension");

  await page.getByLabel("9.0 m").check();
  await page
    .getByLabel("Rationale")
    .fill("Starting from rest leaves only the acceleration term in the displacement equation.");
  await page.getByRole("button", { name: "Commit prediction" }).click();
  await page.getByLabel("Observation unlocked").waitFor();

  const results = await new AxeBuilder({ page }).analyze();
  const criticalViolations = results.violations.filter(
    (violation) => violation.impact === "critical",
  );

  expect(criticalViolations).toEqual([]);
});

test("has no critical accessibility violations after the work-energy-power sim is revealed", async ({
  page,
}) => {
  await page.goto("/#a-level/physics/work-energy-power");

  await page.getByRole("button", { name: "Set up energy transfer" }).click();
  await page.getByRole("button", { name: "Reveal energy transfer" }).click();
  await page.getByLabel("30 J and 15 W").check();
  await page
    .getByLabel("Rationale")
    .fill("The force and displacement point in the same direction, so the work is positive.");
  await page.getByRole("button", { name: "Commit prediction" }).click();
  await page.getByLabel("Observation unlocked").waitFor();

  const results = await new AxeBuilder({ page }).analyze();
  const criticalViolations = results.violations.filter(
    (violation) => violation.impact === "critical",
  );

  expect(criticalViolations).toEqual([]);
});

test("has no serious or critical accessibility violations after the probability-statistics sim is revealed", async ({
  page,
}) => {
  await page.goto("/#a-level/mathematics/probability-statistics");

  await page.getByRole("button", { name: "Set up distribution" }).click();
  await page.getByRole("button", { name: "Reveal decision" }).click();
  await page.getByLabel("The expected score can stay close while the spread increases.").check();
  await page
    .getByLabel("Rationale")
    .fill("A rare high outcome can preserve the centre while increasing spread.");
  await page.getByRole("button", { name: "Commit prediction" }).click();
  await page.getByLabel("Observation unlocked").waitFor();

  const results = await new AxeBuilder({ page }).analyze();
  const seriousOrCriticalViolations = results.violations.filter(
    (violation) => violation.impact === "serious" || violation.impact === "critical",
  );

  expect(seriousOrCriticalViolations).toEqual([]);
});
