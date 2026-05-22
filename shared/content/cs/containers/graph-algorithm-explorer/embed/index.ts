export type {
  ContainerEmbedApi,
  ContainerEmbedScore,
  ContainerEmbedState,
  ContainerEmbedTheme,
} from "./api.js";
import {
  EmbedThemeSpec,
  PredictionCommittedEmbedStateSpec,
} from "../../../../../../core/content-schema/src/index.js";
import type {
  ContainerEmbedApi,
  ContainerEmbedScore,
  ContainerEmbedState,
  ContainerEmbedTheme,
} from "./api.js";

const defaultState: ContainerEmbedState = {
  predictionCommitted: false,
  algorithmMode: "bfs",
  graphScenario: "weighted-detour",
};

const cloneState = (state: ContainerEmbedState): ContainerEmbedState => ({
  predictionCommitted: state.predictionCommitted,
  algorithmMode: state.algorithmMode,
  graphScenario: state.graphScenario,
});

const validateState = (nextState: ContainerEmbedState): ContainerEmbedState => {
  PredictionCommittedEmbedStateSpec.parse(nextState);
  if (
    nextState.algorithmMode !== "bfs" &&
    nextState.algorithmMode !== "dfs" &&
    nextState.algorithmMode !== "dijkstra"
  ) {
    throw new TypeError("algorithmMode must be bfs, dfs, or dijkstra");
  }
  if (nextState.graphScenario !== "weighted-detour" && nextState.graphScenario !== "tie-order") {
    throw new TypeError("graphScenario must be weighted-detour or tie-order");
  }
  return nextState;
};

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
      state = cloneState(validateState(nextState));
    },
    syncTheme(theme: ContainerEmbedTheme): void {
      const parsedTheme = EmbedThemeSpec.parse(theme);
      targetElement?.setAttribute("data-paideia-theme", parsedTheme.colorScheme);
      if (parsedTheme.accentColor !== undefined) {
        targetElement?.setAttribute("data-paideia-accent", parsedTheme.accentColor);
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
