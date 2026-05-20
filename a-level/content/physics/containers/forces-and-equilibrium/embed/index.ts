import type {
  ContainerEmbedApi,
  ContainerEmbedScore,
  ContainerEmbedState,
  ContainerEmbedTheme,
} from "./api.js";
import { z } from "zod";

const defaultState: ContainerEmbedState = {
  predictionCommitted: false,
};

const ContainerEmbedStateSchema: z.ZodType<ContainerEmbedState> = z
  .object({
    predictionCommitted: z.boolean(),
  })
  .strict();

const ContainerEmbedThemeSchema: z.ZodType<ContainerEmbedTheme> = z
  .object({
    colorScheme: z.enum(["light", "dark"]),
    accentColor: z.string().optional(),
  })
  .strict();

const ContainerEmbedScoreSchema: z.ZodType<ContainerEmbedScore> = z
  .object({
    completed: z.boolean(),
    predictionCommitted: z.boolean(),
    score: z.number().min(0).max(1),
  })
  .strict();

const copyState = (state: ContainerEmbedState): ContainerEmbedState => ({ ...state });

export const createContainerEmbed = (): ContainerEmbedApi => {
  let state = copyState(defaultState);
  let targetElement: Element | null = null;

  return {
    async load(target: Element): Promise<void> {
      targetElement = target;
      targetElement.setAttribute("data-paideia-container", "forces-and-equilibrium");
    },
    saveState(): ContainerEmbedState {
      return ContainerEmbedStateSchema.parse(copyState(state));
    },
    score(): ContainerEmbedScore {
      return ContainerEmbedScoreSchema.parse({
        completed: state.predictionCommitted,
        predictionCommitted: state.predictionCommitted,
        score: state.predictionCommitted ? 1 : 0,
      });
    },
    resume(nextState: ContainerEmbedState): void {
      state = copyState(ContainerEmbedStateSchema.parse(nextState));
    },
    syncTheme(nextTheme: ContainerEmbedTheme): void {
      const theme = ContainerEmbedThemeSchema.parse(nextTheme);
      targetElement?.setAttribute("data-paideia-theme", theme.colorScheme);
    },
    destroy(): void {
      targetElement?.removeAttribute("data-paideia-container");
      targetElement?.removeAttribute("data-paideia-theme");
      targetElement = null;
      state = copyState(defaultState);
    },
  };
};

export type {
  ContainerEmbedApi,
  ContainerEmbedScore,
  ContainerEmbedState,
  ContainerEmbedTheme,
};
