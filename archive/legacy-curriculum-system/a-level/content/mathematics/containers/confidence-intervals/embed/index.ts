export type {
  ConfidenceIntervalsEmbedApi,
  ConfidenceIntervalsEmbedScore,
  ConfidenceIntervalsEmbedState,
  ConfidenceIntervalsEmbedTheme,
} from "./api.js";

import type {
  ConfidenceIntervalsEmbedApi,
  ConfidenceIntervalsEmbedScore,
  ConfidenceIntervalsEmbedState,
  ConfidenceIntervalsEmbedTheme,
} from "./api.js";
import { z } from "zod";

const defaultState: ConfidenceIntervalsEmbedState = {
  sampleMean: 68,
  populationStandardDeviation: 9,
  predictionCommitted: false,
  sampleSize: 36,
  confidenceLevel: 0.95,
  comparisonMean: 65,
};

const cloneState = (state: ConfidenceIntervalsEmbedState): ConfidenceIntervalsEmbedState => ({
  sampleMean: state.sampleMean,
  populationStandardDeviation: state.populationStandardDeviation,
  predictionCommitted: state.predictionCommitted,
  sampleSize: state.sampleSize,
  confidenceLevel: state.confidenceLevel,
  comparisonMean: state.comparisonMean,
});

const EmbedStateSchema = z.object({
  sampleMean: z.number().finite().min(50).max(80).optional(),
  populationStandardDeviation: z.number().finite().min(4).max(16).optional(),
  predictionCommitted: z.boolean(),
  sampleSize: z.number().int().min(16).max(100).optional(),
  confidenceLevel: z.union([z.literal(0.9), z.literal(0.95), z.literal(0.99)]).optional(),
  comparisonMean: z.number().finite().min(50).max(80).optional(),
});

const EmbedThemeSchema = z.object({
  colorScheme: z.enum(["light", "dark"]),
  accentColor: z.string().min(1).max(80).optional(),
});

const parseState = (state: ConfidenceIntervalsEmbedState): ConfidenceIntervalsEmbedState =>
  cloneState(EmbedStateSchema.parse(state));

const parseTheme = (theme: ConfidenceIntervalsEmbedTheme): ConfidenceIntervalsEmbedTheme =>
  EmbedThemeSchema.parse(theme);

export const createContainerEmbed = (): ConfidenceIntervalsEmbedApi => {
  let state = cloneState(defaultState);
  let targetElement: Element | null = null;

  return {
    async load(target: Element): Promise<void> {
      targetElement?.removeAttribute("data-paideia-theme");
      targetElement?.removeAttribute("data-paideia-accent");
      targetElement = target;
    },
    saveState(): ConfidenceIntervalsEmbedState {
      return cloneState(state);
    },
    score(): ConfidenceIntervalsEmbedScore {
      return {
        completed: state.predictionCommitted,
        predictionCommitted: state.predictionCommitted,
        score: state.predictionCommitted ? 1 : 0,
      };
    },
    resume(nextState: ConfidenceIntervalsEmbedState): void {
      state = parseState(nextState);
    },
    syncTheme(theme: ConfidenceIntervalsEmbedTheme): void {
      const nextTheme = parseTheme(theme);
      targetElement?.setAttribute("data-paideia-theme", nextTheme.colorScheme);
      if (nextTheme.accentColor !== undefined) {
        targetElement?.setAttribute("data-paideia-accent", nextTheme.accentColor);
      } else {
        targetElement?.removeAttribute("data-paideia-accent");
      }
    },
    destroy(): void {
      targetElement?.removeAttribute("data-paideia-theme");
      targetElement?.removeAttribute("data-paideia-accent");
      targetElement = null;
      state = cloneState(defaultState);
    },
  };
};
