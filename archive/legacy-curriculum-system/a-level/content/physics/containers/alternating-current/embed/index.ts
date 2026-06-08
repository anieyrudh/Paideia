export type {
  AlternatingCurrentEmbedApi,
  AlternatingCurrentEmbedScore,
  AlternatingCurrentEmbedState,
  AlternatingCurrentEmbedTheme,
} from "./api.js";

import { z } from "zod";
import type {
  AlternatingCurrentEmbedApi,
  AlternatingCurrentEmbedScore,
  AlternatingCurrentEmbedState,
  AlternatingCurrentEmbedTheme,
} from "./api.js";

const defaultState: AlternatingCurrentEmbedState = {
  capacitanceMicroFarads: 120,
  frequencyHertz: 50,
  inductanceMilliHenrys: 180,
  predictionCommitted: false,
  resistanceOhms: 40,
  sampleTimeMilliseconds: 5,
  sourceVoltageRmsVolts: 12,
};

const AlternatingCurrentEmbedStateSchema: z.ZodType<AlternatingCurrentEmbedState> = z
  .object({
    capacitanceMicroFarads: z.number().finite().min(20).max(500),
    frequencyHertz: z.number().finite().min(20).max(200),
    inductanceMilliHenrys: z.number().finite().min(10).max(500),
    predictionCommitted: z.boolean(),
    resistanceOhms: z.number().finite().min(10).max(120),
    sampleTimeMilliseconds: z.number().finite().min(0).max(40),
    sourceVoltageRmsVolts: z.number().finite().min(4).max(24),
  })
  .strict();

const AlternatingCurrentEmbedThemeSchema: z.ZodType<AlternatingCurrentEmbedTheme> = z
  .object({
    colorScheme: z.enum(["light", "dark"]),
    accentColor: z.string().optional(),
  })
  .strict();

const AlternatingCurrentEmbedScoreSchema: z.ZodType<AlternatingCurrentEmbedScore> = z
  .object({
    completed: z.boolean(),
    predictionCommitted: z.boolean(),
    score: z.number().min(0).max(1),
  })
  .strict();

const cloneState = (
  state: AlternatingCurrentEmbedState,
): AlternatingCurrentEmbedState => ({
  capacitanceMicroFarads: state.capacitanceMicroFarads,
  frequencyHertz: state.frequencyHertz,
  inductanceMilliHenrys: state.inductanceMilliHenrys,
  predictionCommitted: state.predictionCommitted,
  resistanceOhms: state.resistanceOhms,
  sampleTimeMilliseconds: state.sampleTimeMilliseconds,
  sourceVoltageRmsVolts: state.sourceVoltageRmsVolts,
});

export const createContainerEmbed = (): AlternatingCurrentEmbedApi => {
  let state = cloneState(defaultState);
  let targetElement: Element | null = null;

  return {
    async load(target: Element): Promise<void> {
      targetElement?.removeAttribute("data-paideia-theme");
      targetElement = target;
      targetElement.setAttribute("data-paideia-container", "alternating-current");
    },
    saveState(): AlternatingCurrentEmbedState {
      return AlternatingCurrentEmbedStateSchema.parse(cloneState(state));
    },
    score(): AlternatingCurrentEmbedScore {
      return AlternatingCurrentEmbedScoreSchema.parse({
        completed: state.predictionCommitted,
        predictionCommitted: state.predictionCommitted,
        score: state.predictionCommitted ? 1 : 0,
      });
    },
    resume(nextState: AlternatingCurrentEmbedState): void {
      state = cloneState(AlternatingCurrentEmbedStateSchema.parse(nextState));
    },
    syncTheme(nextTheme: AlternatingCurrentEmbedTheme): void {
      const theme = AlternatingCurrentEmbedThemeSchema.parse(nextTheme);
      targetElement?.setAttribute("data-paideia-theme", theme.colorScheme);
    },
    destroy(): void {
      targetElement?.removeAttribute("data-paideia-theme");
      targetElement?.removeAttribute("data-paideia-container");
      targetElement = null;
      state = cloneState(defaultState);
    },
  };
};
