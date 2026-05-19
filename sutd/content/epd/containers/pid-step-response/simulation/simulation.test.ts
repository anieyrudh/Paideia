/**
 * <Sim Title> · Playwright test
 *
 * MUST include at least one assertion that the prediction-gate blocks reveal
 * until a prediction is committed. The validator scans for the literal token
 * `prediction-gate` in this file and fails the build if missing.
 */

import { expect, test } from "@playwright/test";

test.describe("<Sim Title>", () => {
  test("prediction-gate blocks reveal until commit", async ({ page }) => {
    await page.goto("/?sim=sutd/epd/pid-step-response/pid-step-response");

    // Reveal locked initially
    await expect(page.getByTestId("reveal")).toBeHidden();

    // Make a prediction (interaction depends on commit_format)
    await page.getByTestId("predict-option-0").click();
    await page.getByTestId("predict-rationale").fill("Doubling the mass would slow it down because…");
    await page.getByTestId("predict-commit").click();

    // Reveal now unlocked
    await expect(page.getByTestId("reveal")).toBeVisible();
  });

  test("manipulate controls write to kernel state", async ({ page }) => {
    await page.goto("/?sim=sutd/epd/pid-step-response/pid-step-response");
    // ... commit prediction first ...
    // ... interact with control, assert observed-stage updates ...
  });

  test("axe accessibility scan: 0 critical issues", async ({ page }) => {
    // Wired via @axe-core/playwright in playwright.config.ts
  });
});
