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
