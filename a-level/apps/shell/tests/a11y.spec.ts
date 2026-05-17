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
