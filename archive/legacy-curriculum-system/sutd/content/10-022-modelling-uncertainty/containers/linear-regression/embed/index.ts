import type {
  ContainerEmbedApi,
  ContainerEmbedScore,
  ContainerEmbedState,
  ContainerEmbedTheme,
  EmbedRegressionDataset,
} from "./api.js";

const defaultState: ContainerEmbedState = {
  predictionCommitted: false,
  dataset: "sensor",
  outlierShift: 0,
  noiseLevel: 0,
};

const isDataset = (value: string): value is EmbedRegressionDataset =>
  value === "sensor" || value === "delivery" || value === "study";

const finiteInRange = (value: number, fallback: number, min: number, max: number): number =>
  Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;

const cloneState = (state: ContainerEmbedState): ContainerEmbedState => ({
  predictionCommitted: state.predictionCommitted,
  dataset: isDataset(state.dataset) ? state.dataset : defaultState.dataset,
  outlierShift: finiteInRange(state.outlierShift, defaultState.outlierShift, -12, 12),
  noiseLevel: finiteInRange(state.noiseLevel, defaultState.noiseLevel, 0, 6),
});

export const createContainerEmbed = (): ContainerEmbedApi => {
  let state = cloneState(defaultState);
  let targetElement: Element | null = null;

  return {
    async load(target: Element): Promise<void> {
      targetElement?.removeAttribute("data-paideia-theme");
      targetElement?.removeAttribute("data-paideia-accent");
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
      state = cloneState(nextState);
    },
    syncTheme(theme: ContainerEmbedTheme): void {
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

export type {
  ContainerEmbedApi,
  ContainerEmbedScore,
  ContainerEmbedState,
  ContainerEmbedTheme,
};
