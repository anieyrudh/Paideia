export type {
  NormalAreaMode,
  NormalDistributionEmbedApi,
  NormalDistributionEmbedScore,
  NormalDistributionEmbedState,
  NormalDistributionEmbedTheme,
} from "./api.js";

import type {
  NormalDistributionEmbedApi,
  NormalDistributionEmbedScore,
  NormalDistributionEmbedState,
  NormalDistributionEmbedTheme,
} from "./api.js";
import { z } from "zod";

const defaultState: NormalDistributionEmbedState = {
  mean: 100,
  standardDeviation: 12,
  lowerBound: 88,
  upperBound: 112,
  mode: "between",
  predictionCommitted: false,
};

const cloneState = (state: NormalDistributionEmbedState): NormalDistributionEmbedState => ({
  mean: state.mean,
  standardDeviation: state.standardDeviation,
  lowerBound: state.lowerBound,
  upperBound: state.upperBound,
  mode: state.mode,
  predictionCommitted: state.predictionCommitted,
});

const EmbedStateSchema = z.object({
  mean: z.number().finite().min(60).max(140).optional(),
  standardDeviation: z.number().finite().min(4).max(24).optional(),
  lowerBound: z.number().finite().min(40).max(160).optional(),
  upperBound: z.number().finite().min(40).max(160).optional(),
  mode: z.enum(["between", "left-tail", "right-tail"]).optional(),
  predictionCommitted: z.boolean(),
});

const EmbedThemeSchema = z.object({
  colorScheme: z.enum(["light", "dark"]),
  accentColor: z.string().min(1).max(80).optional(),
});

const parseState = (state: NormalDistributionEmbedState): NormalDistributionEmbedState =>
  cloneState(EmbedStateSchema.parse(state));

const parseTheme = (theme: NormalDistributionEmbedTheme): NormalDistributionEmbedTheme =>
  EmbedThemeSchema.parse(theme);

export const createContainerEmbed = (): NormalDistributionEmbedApi => {
  let state = cloneState(defaultState);
  let targetElement: Element | null = null;

  return {
    async load(target: Element): Promise<void> {
      targetElement?.removeAttribute("data-paideia-theme");
      targetElement?.removeAttribute("data-paideia-accent");
      targetElement = target;
    },
    saveState(): NormalDistributionEmbedState {
      return cloneState(state);
    },
    score(): NormalDistributionEmbedScore {
      return {
        completed: state.predictionCommitted,
        predictionCommitted: state.predictionCommitted,
        score: state.predictionCommitted ? 1 : 0,
      };
    },
    resume(nextState: NormalDistributionEmbedState): void {
      state = parseState(nextState);
    },
    syncTheme(theme: NormalDistributionEmbedTheme): void {
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
