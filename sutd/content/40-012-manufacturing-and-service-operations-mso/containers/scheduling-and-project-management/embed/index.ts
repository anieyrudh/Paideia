import type {
  ContainerEmbedApi,
  ContainerEmbedScore,
  ContainerEmbedState,
  ContainerEmbedTheme,
} from "./api.js";

const defaultState: ContainerEmbedState = {
  predictionCommitted: false,
  prototype: 5,
  tooling: 6,
  training: 4,
};

export const createContainerEmbed = (): ContainerEmbedApi => {
  let state = defaultState;
  let targetElement: Element | null = null;

  return {
    async load(target: Element): Promise<void> {
      targetElement = target;
      target.setAttribute("data-paideia-embed", "scheduling-and-project-management");
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
    syncTheme(theme: ContainerEmbedTheme): void {
      targetElement?.setAttribute("data-paideia-theme", theme.colorScheme);
    },
    destroy(): void {
      targetElement?.removeAttribute("data-paideia-theme");
      targetElement?.removeAttribute("data-paideia-embed");
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
