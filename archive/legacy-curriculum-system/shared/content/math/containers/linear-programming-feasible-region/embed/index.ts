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
  assemblyLimit: 10,
  laborLimit: 14,
  materialLimit: 12,
  profitX: 3,
  profitY: 2,
  testX: 4,
  testY: 4,
};

const cloneState = (state: ContainerEmbedState): ContainerEmbedState => ({
  predictionCommitted: state.predictionCommitted,
  assemblyLimit: state.assemblyLimit,
  laborLimit: state.laborLimit,
  materialLimit: state.materialLimit,
  profitX: state.profitX,
  profitY: state.profitY,
  testX: state.testX,
  testY: state.testY,
});

const inRange = (value: number, min: number, max: number): boolean =>
  Number.isFinite(value) && value >= min && value <= max;

const validateState = (nextState: ContainerEmbedState): ContainerEmbedState => {
  PredictionCommittedEmbedStateSpec.parse(nextState);
  if (!inRange(nextState.assemblyLimit, 8, 14)) {
    throw new TypeError("assemblyLimit must be between 8 and 14 batch-hours");
  }
  if (!inRange(nextState.laborLimit, 10, 18)) {
    throw new TypeError("laborLimit must be between 10 and 18 labour-hours");
  }
  if (!inRange(nextState.materialLimit, 12, 24)) {
    throw new TypeError("materialLimit must be between 12 and 24 material-units");
  }
  if (!inRange(nextState.profitX, 1, 6) || !inRange(nextState.profitY, 1, 6)) {
    throw new TypeError("profit coefficients must be between 1 and 6 profit-units per batch");
  }
  if (!inRange(nextState.testX, 0, 10) || !inRange(nextState.testY, 0, 10)) {
    throw new TypeError("test point coordinates must be between 0 and 10 batches");
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
