import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const seriousOrCritical = (violations: readonly { readonly impact?: string | null }[]) =>
  violations.filter((violation) => violation.impact === "serious" || violation.impact === "critical");

const commitCheckpoint = async (page: Page, rationale: string) => {
  const checkpoint = page.getByRole("form", { name: "Prediction checkpoint" });
  await checkpoint.locator("input[type='radio']").first().check();
  await checkpoint.getByLabel("Rationale").fill(rationale);
  await checkpoint.getByRole("button", { name: "Commit prediction" }).click();
};

test("has no serious or critical accessibility violations on the first shell screen", async ({ page }) => {
  await page.goto("/");

  const results = await new AxeBuilder({ page }).analyze();

  expect(seriousOrCritical(results.violations)).toEqual([]);
});

test("has no serious or critical accessibility violations after the physical-quantities sim is revealed", async ({
  page,
}) => {
  await page.goto("/#a-level/physics/physical-quantities-and-units");

  await commitCheckpoint(
    page,
    "A complete measured speed needs the value, derived unit, and uncertainty.",
  );

  const results = await new AxeBuilder({ page }).analyze();

  expect(seriousOrCritical(results.violations)).toEqual([]);
});

test("shows the physical-quantities model beside the prediction checkpoint", async ({ page }) => {
  await page.goto("/#a-level/physics/physical-quantities-and-units");

  await expect(page.getByRole("form", { name: "Prediction checkpoint" })).toBeVisible();
  await expect(page.getByLabel("Formula and unit reasoning")).toBeVisible();
  await expect(page.getByText("v = 2.50 ± 0.09 m s^-1").first()).toBeVisible();
});

test("has no serious or critical accessibility violations after the scalars-and-vectors sim is revealed", async ({
  page,
}) => {
  await page.goto("/#a-level/physics/scalars-and-vectors");

  await commitCheckpoint(
    page,
    "Perpendicular arrows should form a right triangle, not a straight line.",
  );

  const results = await new AxeBuilder({ page }).analyze();

  expect(seriousOrCritical(results.violations)).toEqual([]);
});

test("has no serious or critical accessibility violations after the resolving-vectors sim is revealed", async ({
  page,
}) => {
  await page.goto("/#a-level/physics/resolving-vectors");

  await commitCheckpoint(
    page,
    "The horizontal component is adjacent to the 30 degree angle, so cosine applies.",
  );

  const results = await new AxeBuilder({ page }).analyze();

  expect(seriousOrCritical(results.violations)).toEqual([]);
});

test("has no serious or critical accessibility violations after the kinematics sim is revealed", async ({
  page,
}) => {
  await page.goto("/#a-level/physics/kinematics-in-one-dimension");

  await commitCheckpoint(
    page,
    "Starting from rest leaves only the acceleration term in the displacement equation.",
  );

  const results = await new AxeBuilder({ page }).analyze();

  expect(seriousOrCritical(results.violations)).toEqual([]);
});

test("has no serious or critical accessibility violations after the work-energy-power sim is revealed", async ({
  page,
}) => {
  await page.goto("/#a-level/physics/work-energy-power");

  const setupButton = page.getByRole("button", { name: "Set up energy transfer" });
    if ((await setupButton.count()) > 0) {
      await setupButton.first().click();
    }
  await page.getByRole("button", { name: "Reveal energy transfer" }).click();
  await commitCheckpoint(
    page,
    "The force and displacement point in the same direction, so the work is positive.",
  );

  const results = await new AxeBuilder({ page }).analyze();

  expect(seriousOrCritical(results.violations)).toEqual([]);
});

test("has no serious or critical accessibility violations after the probability-statistics sim is revealed", async ({
  page,
}) => {
  await page.goto("/#a-level/mathematics/probability-statistics");

  const setupButton = page.getByRole("button", { name: "Set up distribution" });
    if ((await setupButton.count()) > 0) {
      await setupButton.first().click();
    }
  await page.getByRole("button", { name: "Reveal decision" }).click();
  await commitCheckpoint(page, "A rare high outcome can preserve the centre while increasing spread.");

  const results = await new AxeBuilder({ page }).analyze();

  expect(seriousOrCritical(results.violations)).toEqual([]);
});
