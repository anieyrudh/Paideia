import type {
  ResolvingVectorsEmbedApi,
  ResolvingVectorsEmbedScore,
  ResolvingVectorsEmbedState,
  ResolvingVectorsEmbedTheme,
} from "./api.js";

const defaultState: ResolvingVectorsEmbedState = {
  magnitude: 10,
  angleDegrees: 30,
  predictionCommitted: false,
};

export const createResolvingVectorsEmbed = (): ResolvingVectorsEmbedApi => {
  let state = defaultState;
  let targetElement: Element | null = null;
  let theme: ResolvingVectorsEmbedTheme = { colorScheme: "light" };

  return {
    async load(target: Element): Promise<void> {
      targetElement = target;
      targetElement.setAttribute("data-paideia-container", "resolving-vectors");
    },
    saveState(): ResolvingVectorsEmbedState {
      return state;
    },
    score(): ResolvingVectorsEmbedScore {
      return {
        completed: state.predictionCommitted,
        predictionCommitted: state.predictionCommitted,
        score: state.predictionCommitted ? 1 : 0,
      };
    },
    resume(nextState: ResolvingVectorsEmbedState): void {
      state = nextState;
    },
    syncTheme(nextTheme: ResolvingVectorsEmbedTheme): void {
      theme = nextTheme;
      targetElement?.setAttribute("data-paideia-theme", theme.colorScheme);
    },
    destroy(): void {
      targetElement?.removeAttribute("data-paideia-container");
      targetElement?.removeAttribute("data-paideia-theme");
      targetElement = null;
      state = defaultState;
    },
  };
};

export type {
  ResolvingVectorsEmbedApi,
  ResolvingVectorsEmbedScore,
  ResolvingVectorsEmbedState,
  ResolvingVectorsEmbedTheme,
};
