import { expect, test, type Page } from "@playwright/test";

export interface ProductRevealSetupStep {
  readonly role: "button";
  readonly name: string;
}

export interface ProductRevealContract {
  readonly simId: string;
  readonly setup?: readonly ProductRevealSetupStep[];
  readonly prediction: {
    readonly optionLabel: string;
    readonly rationale: string;
  };
  readonly reveal?: {
    readonly observationLabel?: string;
    readonly visual?: "required" | "not-applicable";
    readonly formula?: "required" | "not-applicable";
    readonly formulaNotApplicableReason?: string;
  };
}

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

const expectObservationText = async (page: Page, observationLabel: string, text: string) => {
  await expect(page.getByLabel(observationLabel).getByText(text, { exact: false }).first()).toBeVisible();
};

export const expectProductSimulationReveal = async (
  page: Page,
  contract: ProductRevealContract,
): Promise<void> => {
  const observationLabel = contract.reveal?.observationLabel ?? "Observation unlocked";
  const visualRequirement = contract.reveal?.visual ?? "required";
  const formulaRequirement = contract.reveal?.formula ?? "required";

  await mountSim(page, contract.simId);

  await expect(page.getByLabel(observationLabel)).toHaveCount(0);
  for (const step of contract.setup ?? []) {
    await page.getByRole(step.role, { name: step.name }).click();
  }

  await expect(page.getByRole("form", { name: "Prediction gate" })).toBeVisible();
  await expect(page.getByLabel(observationLabel)).toHaveCount(0);

  await page.getByLabel(contract.prediction.optionLabel).check();
  await page.getByLabel("Rationale").fill(contract.prediction.rationale);
  await page.getByRole("button", { name: "Commit prediction" }).click();

  await expect(page.getByLabel(observationLabel)).toBeVisible();

  if (visualRequirement === "required") {
    await expectRevealedSimulationVisual(page, observationLabel);
  }

  if (formulaRequirement === "required") {
    await expectObservationText(page, observationLabel, "Formula");
    await expectObservationText(page, observationLabel, "Substitution");
    await expectObservationText(page, observationLabel, "Units");
    await expectObservationText(page, observationLabel, "Result");
    await expectObservationText(page, observationLabel, "Legend");
  } else if (!contract.reveal?.formulaNotApplicableReason) {
    throw new Error(
      `${contract.simId} declares formula not-applicable but does not provide a reason.`,
    );
  }
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
