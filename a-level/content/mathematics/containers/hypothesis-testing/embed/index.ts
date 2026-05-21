export type {
  HypothesisTestingEmbedApi,
  HypothesisTestingEmbedScore,
  HypothesisTestingEmbedState,
  HypothesisTestingEmbedTheme,
} from "./api.js";

import type {
  HypothesisTestingEmbedApi,
  HypothesisTestingEmbedScore,
  HypothesisTestingEmbedState,
  HypothesisTestingEmbedTheme,
} from "./api.js";
import { z } from "zod";

const defaultState: HypothesisTestingEmbedState = {
  alpha: 0.05,
  nullMean: 64,
  observedMean: 67.2,
  populationStandardDeviation: 8,
  predictionCommitted: false,
  sampleSize: 36,
  tail: "greater",
};

const cloneState = (state: HypothesisTestingEmbedState): HypothesisTestingEmbedState => ({
  alpha: state.alpha,
  nullMean: state.nullMean,
  observedMean: state.observedMean,
  populationStandardDeviation: state.populationStandardDeviation,
  predictionCommitted: state.predictionCommitted,
  sampleSize: state.sampleSize,
  tail: state.tail,
});

const EmbedStateSchema = z.object({
  alpha: z.union([z.literal(0.1), z.literal(0.05), z.literal(0.01)]).optional(),
  nullMean: z.number().finite().min(50).max(80).optional(),
  observedMean: z.number().finite().min(50).max(80).optional(),
  populationStandardDeviation: z.number().finite().min(4).max(16).optional(),
  predictionCommitted: z.boolean(),
  sampleSize: z.number().int().min(16).max(100).optional(),
  tail: z.enum(["greater", "less", "two-sided"]).optional(),
});

const EmbedThemeSchema = z.object({
  colorScheme: z.enum(["light", "dark"]),
  accentColor: z.string().min(1).max(80).optional(),
});

const parseState = (state: HypothesisTestingEmbedState): HypothesisTestingEmbedState =>
  cloneState(EmbedStateSchema.parse(state));

const parseTheme = (theme: HypothesisTestingEmbedTheme): HypothesisTestingEmbedTheme =>
  EmbedThemeSchema.parse(theme);

export const createContainerEmbed = (): HypothesisTestingEmbedApi => {
  let state = cloneState(defaultState);
  let targetElement: Element | null = null;

  return {
    async load(target: Element): Promise<void> {
      targetElement?.removeAttribute("data-paideia-theme");
      targetElement?.removeAttribute("data-paideia-accent");
      targetElement = target;
    },
    saveState(): HypothesisTestingEmbedState {
      return cloneState(state);
    },
    score(): HypothesisTestingEmbedScore {
      return {
        completed: state.predictionCommitted,
        predictionCommitted: state.predictionCommitted,
        score: state.predictionCommitted ? 1 : 0,
      };
    },
    resume(nextState: HypothesisTestingEmbedState): void {
      state = parseState(nextState);
    },
    syncTheme(theme: HypothesisTestingEmbedTheme): void {
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
