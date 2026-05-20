export type {
  ProbabilityStatisticsEmbedApi,
  ProbabilityStatisticsEmbedScore,
  ProbabilityStatisticsEmbedState,
  ProbabilityStatisticsEmbedTheme,
} from "./api.js";

import type {
  ProbabilityStatisticsEmbedApi,
  ProbabilityStatisticsEmbedScore,
  ProbabilityStatisticsEmbedState,
  ProbabilityStatisticsEmbedTheme,
} from "./api.js";

const defaultState: ProbabilityStatisticsEmbedState = {
  highScore: 10,
  highWeight: 2,
  lowWeight: 3,
  observedMean: 5.4,
  predictionCommitted: false,
  sampleSize: 36,
  typicalWeight: 5,
};

const cloneState = (state: ProbabilityStatisticsEmbedState): ProbabilityStatisticsEmbedState => ({
  highScore: state.highScore,
  highWeight: state.highWeight,
  lowWeight: state.lowWeight,
  observedMean: state.observedMean,
  predictionCommitted: state.predictionCommitted,
  sampleSize: state.sampleSize,
  typicalWeight: state.typicalWeight,
});

export const createContainerEmbed = (): ProbabilityStatisticsEmbedApi => {
  let state = cloneState(defaultState);
  let targetElement: Element | null = null;

  return {
    async load(target: Element): Promise<void> {
      targetElement?.removeAttribute("data-paideia-theme");
      targetElement = target;
    },
    saveState(): ProbabilityStatisticsEmbedState {
      return cloneState(state);
    },
    score(): ProbabilityStatisticsEmbedScore {
      return {
        completed: state.predictionCommitted,
        predictionCommitted: state.predictionCommitted,
        score: state.predictionCommitted ? 1 : 0,
      };
    },
    resume(nextState: ProbabilityStatisticsEmbedState): void {
      state = cloneState(nextState);
    },
    syncTheme(theme: ProbabilityStatisticsEmbedTheme): void {
      targetElement?.setAttribute("data-paideia-theme", theme.colorScheme);
      if (theme.accentColor !== undefined) {
        targetElement?.setAttribute("data-paideia-accent", theme.accentColor);
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
