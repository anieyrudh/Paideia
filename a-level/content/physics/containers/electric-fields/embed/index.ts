export type {
  ElectricFieldsEmbedApi,
  ElectricFieldsEmbedScore,
  ElectricFieldsEmbedState,
  ElectricFieldsEmbedTheme,
} from "./api.js";

import { z } from "zod";
import type {
  ElectricFieldsEmbedApi,
  ElectricFieldsEmbedScore,
  ElectricFieldsEmbedState,
  ElectricFieldsEmbedTheme,
} from "./api.js";

const defaultState: ElectricFieldsEmbedState = {
  angleDegrees: 0,
  predictionCommitted: false,
  separationCm: 15,
  sourceChargeMicroC: 0.5,
  testChargeNanoC: -20,
};

const ElectricFieldsEmbedStateSchema: z.ZodType<ElectricFieldsEmbedState> = z
  .object({
    angleDegrees: z.number().finite().min(0).max(180),
    predictionCommitted: z.boolean(),
    separationCm: z.number().finite().min(5).max(25),
    sourceChargeMicroC: z.number().finite().min(-1).max(1),
    testChargeNanoC: z.number().finite().min(-30).max(30),
  })
  .strict();

const ElectricFieldsEmbedThemeSchema: z.ZodType<ElectricFieldsEmbedTheme> = z
  .object({
    colorScheme: z.enum(["light", "dark"]),
    accentColor: z.string().optional(),
  })
  .strict();

const ElectricFieldsEmbedScoreSchema: z.ZodType<ElectricFieldsEmbedScore> = z
  .object({
    completed: z.boolean(),
    predictionCommitted: z.boolean(),
    score: z.number().min(0).max(1),
  })
  .strict();

const cloneState = (state: ElectricFieldsEmbedState): ElectricFieldsEmbedState => ({
  angleDegrees: state.angleDegrees,
  predictionCommitted: state.predictionCommitted,
  separationCm: state.separationCm,
  sourceChargeMicroC: state.sourceChargeMicroC,
  testChargeNanoC: state.testChargeNanoC,
});

export const createContainerEmbed = (): ElectricFieldsEmbedApi => {
  let state = cloneState(defaultState);
  let targetElement: Element | null = null;

  return {
    async load(target: Element): Promise<void> {
      targetElement?.removeAttribute("data-paideia-theme");
      targetElement = target;
    },
    saveState(): ElectricFieldsEmbedState {
      return ElectricFieldsEmbedStateSchema.parse(cloneState(state));
    },
    score(): ElectricFieldsEmbedScore {
      return ElectricFieldsEmbedScoreSchema.parse({
        completed: state.predictionCommitted,
        predictionCommitted: state.predictionCommitted,
        score: state.predictionCommitted ? 1 : 0,
      });
    },
    resume(nextState: ElectricFieldsEmbedState): void {
      state = cloneState(ElectricFieldsEmbedStateSchema.parse(nextState));
    },
    syncTheme(nextTheme: ElectricFieldsEmbedTheme): void {
      const theme = ElectricFieldsEmbedThemeSchema.parse(nextTheme);
      targetElement?.setAttribute("data-paideia-theme", theme.colorScheme);
    },
    destroy(): void {
      targetElement?.removeAttribute("data-paideia-theme");
      targetElement = null;
      state = cloneState(defaultState);
    },
  };
};
