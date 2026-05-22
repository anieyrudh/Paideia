import { z } from "zod";
import type {
  ContainerEmbedApi,
  ContainerEmbedScore,
  ContainerEmbedState,
  ContainerEmbedTheme,
} from "./api.js";

const AlternativeSchema = z.enum(["greater", "less", "two-sided"]);
const AlphaSchema = z.union([z.literal(0.1), z.literal(0.05), z.literal(0.01)]);

const ContainerEmbedStateSchema = z.object({
  predictionCommitted: z.boolean(),
  nullMean: z.number().finite().optional(),
  observedMean: z.number().finite().optional(),
  populationStandardDeviation: z.number().positive().optional(),
  sampleSize: z.number().int().positive().optional(),
  alpha: AlphaSchema.optional(),
  alternative: AlternativeSchema.optional(),
});

const ContainerEmbedThemeSchema = z.object({
  colorScheme: z.enum(["light", "dark"]),
  accentColor: z.string().optional(),
});

const defaultState: ContainerEmbedState = {
  predictionCommitted: false,
};

const cloneState = (state: ContainerEmbedState): ContainerEmbedState => ({ ...state });

export const createContainerEmbed = (): ContainerEmbedApi => {
  let state = cloneState(defaultState);
  let targetElement: Element | null = null;

  return {
    async load(target: Element): Promise<void> {
      targetElement?.removeAttribute("data-paideia-theme");
      targetElement = target;
    },
    saveState(): ContainerEmbedState {
      return cloneState(state);
    },
    score(): ContainerEmbedScore {
      return {
        completed: state.predictionCommitted,
        predictionCommitted: state.predictionCommitted,
        score: state.predictionCommitted ? 1 : 0,
      };
    },
    resume(nextState: ContainerEmbedState): void {
      state = cloneState(ContainerEmbedStateSchema.parse(nextState));
    },
    syncTheme(theme: ContainerEmbedTheme): void {
      const parsedTheme = ContainerEmbedThemeSchema.parse(theme);
      targetElement?.setAttribute("data-paideia-theme", parsedTheme.colorScheme);
      if (parsedTheme.accentColor !== undefined) {
        targetElement?.setAttribute("data-paideia-accent", parsedTheme.accentColor);
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

export type {
  ContainerEmbedApi,
  ContainerEmbedScore,
  ContainerEmbedState,
  ContainerEmbedTheme,
};
