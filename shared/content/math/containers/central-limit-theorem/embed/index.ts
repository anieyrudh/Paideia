import type {
  CentralLimitTheoremEmbedApi,
  CentralLimitTheoremEmbedScore,
  CentralLimitTheoremEmbedState,
  CentralLimitTheoremEmbedTheme,
} from "./api.js";
import {
  EmbedThemeSpec,
  PredictionCommittedEmbedStateSpec,
} from "../../../../../../core/content-schema/src/index.js";

const defaultState: CentralLimitTheoremEmbedState = {
  predictionCommitted: false,
};

const cloneState = (state: CentralLimitTheoremEmbedState): CentralLimitTheoremEmbedState => ({
  predictionCommitted: state.predictionCommitted,
  ...(state.population === undefined ? {} : { population: state.population }),
  ...(state.sampleSize === undefined ? {} : { sampleSize: state.sampleSize }),
  ...(state.sampleCount === undefined ? {} : { sampleCount: state.sampleCount }),
  ...(state.seed === undefined ? {} : { seed: state.seed }),
});

const validatePositiveInteger = (value: number | undefined, label: string): void => {
  if (value !== undefined && (!Number.isInteger(value) || value <= 0)) {
    throw new TypeError(`${label} must be a positive integer`);
  }
};

const validateState = (
  nextState: CentralLimitTheoremEmbedState,
): CentralLimitTheoremEmbedState => {
  PredictionCommittedEmbedStateSpec.parse(nextState);
  if (
    nextState.population !== undefined &&
    nextState.population !== "right-skewed" &&
    nextState.population !== "uniform" &&
    nextState.population !== "two-cluster"
  ) {
    throw new TypeError("population must be one of the supported CLT populations");
  }
  validatePositiveInteger(nextState.sampleSize, "sampleSize");
  validatePositiveInteger(nextState.sampleCount, "sampleCount");
  if (nextState.seed !== undefined && !Number.isFinite(nextState.seed)) {
    throw new TypeError("seed must be finite");
  }
  return nextState;
};

export const createCentralLimitTheoremEmbed = (): CentralLimitTheoremEmbedApi => {
  let state = cloneState(defaultState);
  let targetElement: Element | null = null;

  return {
    async load(target: Element): Promise<void> {
      targetElement?.removeAttribute("data-paideia-theme");
      targetElement?.removeAttribute("data-paideia-accent");
      targetElement = target;
    },
    saveState(): CentralLimitTheoremEmbedState {
      return cloneState(state);
    },
    score(): CentralLimitTheoremEmbedScore {
      return {
        completed: state.predictionCommitted,
        predictionCommitted: state.predictionCommitted,
        score: state.predictionCommitted ? 1 : 0,
      };
    },
    resume(nextState: CentralLimitTheoremEmbedState): void {
      state = cloneState(validateState(nextState));
    },
    syncTheme(theme: CentralLimitTheoremEmbedTheme): void {
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

export type {
  CentralLimitTheoremEmbedApi,
  CentralLimitTheoremEmbedScore,
  CentralLimitTheoremEmbedState,
  CentralLimitTheoremEmbedTheme,
};
