import type {
  ContainerEmbedApi,
  ContainerEmbedScore,
  ContainerEmbedState,
  ContainerEmbedTheme,
} from "./api.js";
import { z } from "zod";

const ContainerEmbedStateSchema = z.object({
  predictionCommitted: z.boolean(),
});

const ContainerEmbedThemeSchema = z.object({
  colorScheme: z.enum(["light", "dark"]),
  accentColor: z.string().optional(),
});

const defaultState: ContainerEmbedState = {
  predictionCommitted: false,
};

const cloneState = (state: ContainerEmbedState): ContainerEmbedState => ({
  predictionCommitted: state.predictionCommitted,
});

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
    },
    destroy(): void {
      targetElement?.removeAttribute("data-paideia-theme");
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
