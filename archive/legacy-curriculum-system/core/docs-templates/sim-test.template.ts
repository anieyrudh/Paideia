/**
 * <Sim Title> · Playwright test
 *
 * MUST include at least one assertion that the live model is visible while the
 * prediction-checkpoint saves learner reflection. The validator scans for the
 * literal token `prediction-checkpoint` in this file and fails the build if
 * missing.
 */

import { expect, test } from "@playwright/test";

test.describe("<Sim Title>", () => {
  test("prediction-checkpoint keeps reveal visible while saving reflection", async ({ page }) => {
    await page.goto("/?sim=<BRANCH>/<SUBJECT>/<PACKAGE_ID>/<SIM_ID>");

    // Observation visible initially
    await expect(page.getByTestId("observation")).toBeVisible();

    // Make a prediction (interaction depends on commit_format)
    await page.getByTestId("predict-option-0").click();
    await page.getByTestId("predict-rationale").fill("Doubling the mass would slow it down because…");
    await page.getByTestId("predict-commit").click();

    // Observation remains available after saving the checkpoint
    await expect(page.getByTestId("observation")).toBeVisible();
  });

  test("manipulate controls write to kernel state", async ({ page }) => {
    await page.goto("/?sim=<BRANCH>/<SUBJECT>/<PACKAGE_ID>/<SIM_ID>");
    // ... commit prediction first ...
    // ... interact with control, assert observed-stage updates ...
  });

  test("axe accessibility scan: 0 critical issues", async ({ page }) => {
    // Wired via @axe-core/playwright in playwright.config.ts
  });
});
