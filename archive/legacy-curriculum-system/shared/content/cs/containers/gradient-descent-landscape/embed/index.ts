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
  landscape: "ravine",
  startX: -3,
  startY: -2.4,
  learningRate: 0.22,
  maxSteps: 24,
};

const cloneState = (state: ContainerEmbedState): ContainerEmbedState => ({
  predictionCommitted: state.predictionCommitted,
  landscape: state.landscape,
  startX: state.startX,
  startY: state.startY,
  learningRate: state.learningRate,
  maxSteps: state.maxSteps,
});

const validateState = (nextState: ContainerEmbedState): ContainerEmbedState => {
  PredictionCommittedEmbedStateSpec.parse(nextState);
  if (
    nextState.landscape !== "bowl" &&
    nextState.landscape !== "ravine" &&
    nextState.landscape !== "saddle"
  ) {
    throw new TypeError("landscape must be one of the supported optimization landscapes");
  }
  if (!Number.isFinite(nextState.startX) || !Number.isFinite(nextState.startY)) {
    throw new TypeError("start coordinates must be finite");
  }
  if (!Number.isFinite(nextState.learningRate) || nextState.learningRate <= 0) {
    throw new TypeError("learningRate must be positive and finite");
  }
  if (!Number.isInteger(nextState.maxSteps) || nextState.maxSteps <= 0) {
    throw new TypeError("maxSteps must be a positive integer");
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
