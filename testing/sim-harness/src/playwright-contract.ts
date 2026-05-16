import { expect, test, type Page } from "@playwright/test";

export interface PredictionGateContract {
  readonly simId: string;
  readonly predictionLabel: string;
  readonly rationale: string;
  readonly observationLabel?: string;
  readonly expectedText?: readonly string[];
}

export const mountSim = async (page: Page, simId: string): Promise<void> => {
  await page.goto(`/?sim=${encodeURIComponent(simId)}`);
};

export const definePredictionGateContract = ({
  simId,
  predictionLabel,
  rationale,
  observationLabel = "Observation unlocked",
  expectedText = [],
}: PredictionGateContract): void => {
  test.describe(`${simId} prediction-gate`, () => {
    test("prediction-gate blocks observation until prediction commit", async ({ page }) => {
      await mountSim(page, simId);

      await expect(page.getByRole("form", { name: "Prediction gate" })).toBeVisible();
      await expect(page.getByLabel(observationLabel)).toHaveCount(0);

      await page.getByLabel(predictionLabel).check();
      await page.getByLabel("Rationale").fill(rationale);
      await page.getByRole("button", { name: "Commit prediction" }).click();

      await expect(page.getByLabel(observationLabel)).toBeVisible();
      for (const text of expectedText) {
        await expect(page.getByText(text)).toBeVisible();
      }
    });
  });
};
