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
  readonly observation?: {
    readonly observationLabel?: string;
    readonly visual?: "required" | "not-applicable";
    readonly formula?: "required" | "not-applicable";
    readonly formulaNotApplicableReason?: string;
  };
  /**
   * @deprecated Use observation. Prediction no longer gates the simulation.
   */
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

export const expectProductSimulationExperience = async (
  page: Page,
  contract: ProductRevealContract,
): Promise<void> => {
  const observation = contract.observation ?? contract.reveal;
  const observationLabel = observation?.observationLabel ?? "Observation unlocked";
  const visualRequirement = observation?.visual ?? "required";
  const formulaRequirement = observation?.formula ?? "required";

  await mountSim(page, contract.simId);

  for (const step of contract.setup ?? []) {
    const setupControl = page.getByRole(step.role, { name: step.name });
    if ((await setupControl.count()) > 0) {
      await setupControl.first().click();
    }
  }

  await expect(page.getByLabel(observationLabel)).toBeVisible();
  await expect(page.getByRole("form", { name: "Prediction checkpoint" })).toBeVisible();

  if (visualRequirement === "required") {
    await expectRevealedSimulationVisual(page, observationLabel);
  }

  if (formulaRequirement === "required") {
    await expectObservationText(page, observationLabel, "Formula");
    await expectObservationText(page, observationLabel, "Substitution");
    await expectObservationText(page, observationLabel, "Units");
    await expectObservationText(page, observationLabel, "Result");
    await expectObservationText(page, observationLabel, "Legend");
  } else if (!observation?.formulaNotApplicableReason) {
    throw new Error(
      `${contract.simId} declares formula not-applicable but does not provide a reason.`,
    );
  }

  const checkpoint = page.getByRole("form", { name: "Prediction checkpoint" });
  const namedOption = checkpoint.getByLabel(contract.prediction.optionLabel);
  if ((await namedOption.count()) > 0) {
    await namedOption.first().check();
  } else if ((await checkpoint.locator("input[type='radio']").count()) > 0) {
    await checkpoint.locator("input[type='radio']").first().check();
  } else {
    await checkpoint.getByLabel("Prediction").fill(contract.prediction.optionLabel);
  }
  await checkpoint.getByLabel("Rationale").fill(contract.prediction.rationale);
  await checkpoint.getByRole("button", { name: "Commit prediction" }).click();

  await expect(page.getByLabel(observationLabel)).toBeVisible();
  await expect(page.getByRole("region", { name: "Prediction checkpoint" })).toBeVisible();
};

export const expectProductSimulationReveal = expectProductSimulationExperience;

export const definePredictionGateContract = ({
  simId,
  predictionLabel,
  rationale,
  observationLabel = "Observation unlocked",
  expectedText = [],
}: PredictionGateContract): void => {
  test.describe(`${simId} prediction-checkpoint`, () => {
    test("prediction checkpoint saves reflection while observation stays visible", async ({ page }) => {
      await mountSim(page, simId);

      await expect(page.getByRole("form", { name: "Prediction checkpoint" })).toBeVisible();
      await expect(page.getByLabel(observationLabel)).toBeVisible();

      const checkpoint = page.getByRole("form", { name: "Prediction checkpoint" });
      const namedOption = checkpoint.getByLabel(predictionLabel);
      if ((await namedOption.count()) > 0) {
        await namedOption.first().check();
      } else if ((await checkpoint.locator("input[type='radio']").count()) > 0) {
        await checkpoint.locator("input[type='radio']").first().check();
      } else {
        await checkpoint.getByLabel("Prediction").fill(predictionLabel);
      }
      await checkpoint.getByLabel("Rationale").fill(rationale);
      await checkpoint.getByRole("button", { name: "Commit prediction" }).click();

      await expect(page.getByLabel(observationLabel)).toBeVisible();
      for (const text of expectedText) {
        await expect(page.getByText(text).first()).toBeVisible();
      }
    });
  });
};
