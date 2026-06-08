import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const seriousOrCritical = (violations: readonly { readonly impact?: string | null }[]) =>
  violations.filter((violation) => violation.impact === "serious" || violation.impact === "critical");

test("has no serious or critical accessibility violations on the empty SUTD shell", async ({ page }) => {
  await page.goto("/");

  const results = await new AxeBuilder({ page }).analyze();

  expect(seriousOrCritical(results.violations)).toEqual([]);
});
