import type {
  ScalarsVectorsEmbedApi,
  ScalarsVectorsEmbedScore,
  ScalarsVectorsEmbedState,
  ScalarsVectorsEmbedTheme,
} from "./api.js";

const defaultState: ScalarsVectorsEmbedState = {
  vectorA: 5,
  vectorB: 5,
  angleDegrees: 90,
  predictionCommitted: false,
};

export const createScalarsVectorsEmbed = (): ScalarsVectorsEmbedApi => {
  let state = defaultState;
  let targetElement: Element | null = null;
  let theme: ScalarsVectorsEmbedTheme = { colorScheme: "light" };

  return {
    async load(target: Element): Promise<void> {
      targetElement = target;
    },
    saveState(): ScalarsVectorsEmbedState {
      return state;
    },
    score(): ScalarsVectorsEmbedScore {
      return {
        completed: state.predictionCommitted,
        predictionCommitted: state.predictionCommitted,
        score: state.predictionCommitted ? 1 : 0,
      };
    },
    resume(nextState: ScalarsVectorsEmbedState): void {
      state = nextState;
    },
    syncTheme(nextTheme: ScalarsVectorsEmbedTheme): void {
      theme = nextTheme;
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
  ScalarsVectorsEmbedApi,
  ScalarsVectorsEmbedScore,
  ScalarsVectorsEmbedState,
  ScalarsVectorsEmbedTheme,
};
