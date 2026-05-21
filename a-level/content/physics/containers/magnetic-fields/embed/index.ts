export type {
  MagneticFieldsEmbedApi,
  MagneticFieldsEmbedScore,
  MagneticFieldsEmbedState,
  MagneticFieldsEmbedTheme,
} from "./api.js";

import { z } from "zod";
import type {
  MagneticFieldsEmbedApi,
  MagneticFieldsEmbedScore,
  MagneticFieldsEmbedState,
  MagneticFieldsEmbedTheme,
} from "./api.js";

const defaultState: MagneticFieldsEmbedState = {
  activeLengthCm: 8,
  angleDegrees: 90,
  currentAmperes: 6,
  fieldMilliTesla: 40,
  particleChargeMicroC: 2,
  particleMassMilligrams: 50,
  particleSpeedKmPerSecond: 1,
  predictionCommitted: false,
};

const MagneticFieldsEmbedStateSchema: z.ZodType<MagneticFieldsEmbedState> = z
  .object({
    activeLengthCm: z.number().finite().min(2).max(20),
    angleDegrees: z.number().finite().min(0).max(90),
    currentAmperes: z.number().finite().min(0).max(12),
    fieldMilliTesla: z.number().finite().min(5).max(120),
    particleChargeMicroC: z.number().finite().min(-8).max(8),
    particleMassMilligrams: z.number().finite().min(5).max(200),
    particleSpeedKmPerSecond: z.number().finite().min(0.2).max(5),
    predictionCommitted: z.boolean(),
  })
  .strict();

const MagneticFieldsEmbedThemeSchema: z.ZodType<MagneticFieldsEmbedTheme> = z
  .object({
    colorScheme: z.enum(["light", "dark"]),
    accentColor: z.string().optional(),
  })
  .strict();

const MagneticFieldsEmbedScoreSchema: z.ZodType<MagneticFieldsEmbedScore> = z
  .object({
    completed: z.boolean(),
    predictionCommitted: z.boolean(),
    score: z.number().min(0).max(1),
  })
  .strict();

const cloneState = (state: MagneticFieldsEmbedState): MagneticFieldsEmbedState => ({
  activeLengthCm: state.activeLengthCm,
  angleDegrees: state.angleDegrees,
  currentAmperes: state.currentAmperes,
  fieldMilliTesla: state.fieldMilliTesla,
  particleChargeMicroC: state.particleChargeMicroC,
  particleMassMilligrams: state.particleMassMilligrams,
  particleSpeedKmPerSecond: state.particleSpeedKmPerSecond,
  predictionCommitted: state.predictionCommitted,
});

export const createContainerEmbed = (): MagneticFieldsEmbedApi => {
  let state = cloneState(defaultState);
  let targetElement: Element | null = null;

  return {
    async load(target: Element): Promise<void> {
      targetElement?.removeAttribute("data-paideia-theme");
      targetElement = target;
    },
    saveState(): MagneticFieldsEmbedState {
      return MagneticFieldsEmbedStateSchema.parse(cloneState(state));
    },
    score(): MagneticFieldsEmbedScore {
      return MagneticFieldsEmbedScoreSchema.parse({
        completed: state.predictionCommitted,
        predictionCommitted: state.predictionCommitted,
        score: state.predictionCommitted ? 1 : 0,
      });
    },
    resume(nextState: MagneticFieldsEmbedState): void {
      state = cloneState(MagneticFieldsEmbedStateSchema.parse(nextState));
    },
    syncTheme(nextTheme: MagneticFieldsEmbedTheme): void {
      const theme = MagneticFieldsEmbedThemeSchema.parse(nextTheme);
      targetElement?.setAttribute("data-paideia-theme", theme.colorScheme);
    },
    destroy(): void {
      targetElement?.removeAttribute("data-paideia-theme");
      targetElement = null;
      state = cloneState(defaultState);
    },
  };
};
