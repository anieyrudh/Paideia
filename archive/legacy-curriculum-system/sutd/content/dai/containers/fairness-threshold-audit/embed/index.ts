import type {
  ContainerEmbedApi,
  ContainerEmbedScore,
  ContainerEmbedState,
  ContainerEmbedTheme,
} from "./api.js";

const defaultState: ContainerEmbedState = {
  predictionCommitted: false,
};

export const createContainerEmbed = (): ContainerEmbedApi => {
  let state = defaultState;
  let targetElement: Element | null = null;

  return {
    async load(target: Element): Promise<void> {
      targetElement = target;
    },
    saveState(): ContainerEmbedState {
      return state;
    },
    score(): ContainerEmbedScore {
      return {
        completed: state.predictionCommitted,
        predictionCommitted: state.predictionCommitted,
        score: state.predictionCommitted ? 1 : 0,
      };
    },
    resume(nextState: ContainerEmbedState): void {
      state = nextState;
    },
    syncTheme(theme: ContainerEmbedTheme | null | undefined): void {
      if (!theme) {
        targetElement?.removeAttribute("data-paideia-theme");
        return;
      }
      targetElement?.setAttribute("data-paideia-theme", theme.colorScheme);
    },
    destroy(): void {
      targetElement?.removeAttribute("data-paideia-theme");
      targetElement = null;
      state = defaultState;
    },
  };
};

export type {
  ContainerEmbedApi,
  ContainerEmbedScore,
  ContainerEmbedState,
  ContainerEmbedTheme,
};
