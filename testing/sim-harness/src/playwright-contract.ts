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

export const expectRevealedSimulationVisual = async (
  page: Page,
  observationLabel = "Observation unlocked",
): Promise<void> => {
  const observation = page.getByLabel(observationLabel);
  await expect(observation).toBeVisible();

  const visual = observation.locator("svg:visible, canvas:visible, [role='img']:visible");
  const visualCount = await visual.count();
  expect(
    visualCount,
    `Expected revealed "${observationLabel}" state to include a visible chart, diagram, canvas, or image role.`,
  ).toBeGreaterThan(0);
  await expect(visual.first()).toBeVisible();
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
        await expect(page.getByText(text).first()).toBeVisible();
      }
    });
  });
};
