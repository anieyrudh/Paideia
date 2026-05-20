import type { ContainerEmbedApi, ContainerEmbedState, ContainerEmbedTheme } from "./api.js";
import {
  EmbedThemeSpec,
  PredictionCommittedEmbedStateSpec,
} from "../../../../../../core/content-schema/src/index.js";

const defaultState: ContainerEmbedState = {
  predictionCommitted: false,
  preset: "stable-spiral",
  trace: -0.6,
  determinant: 1.2,
  initialX: 1.4,
  initialY: 0,
};

const cloneState = (state: ContainerEmbedState): ContainerEmbedState => ({
  predictionCommitted: state.predictionCommitted,
  preset: state.preset,
  trace: state.trace,
  determinant: state.determinant,
  initialX: state.initialX,
  initialY: state.initialY,
});

const isSupportedPreset = (value: string): value is ContainerEmbedState["preset"] =>
  value === "stable-spiral" || value === "saddle" || value === "center" || value === "unstable-node";

const validateState = (nextState: ContainerEmbedState): ContainerEmbedState => {
  PredictionCommittedEmbedStateSpec.parse(nextState);
  if (!isSupportedPreset(nextState.preset)) {
    throw new TypeError("preset must be one of the supported ODE phase portrait presets");
  }
  if (
    !Number.isFinite(nextState.trace) ||
    !Number.isFinite(nextState.determinant) ||
    !Number.isFinite(nextState.initialX) ||
    !Number.isFinite(nextState.initialY)
  ) {
    throw new TypeError("trace, determinant, and initial coordinates must be finite");
  }
  return nextState;
};

export const createContainerEmbed = (): ContainerEmbedApi => {
  let state = cloneState(defaultState);
  let targetElement: Element | null = null;

  return {
    async load(target: Element): Promise<void> {
      targetElement?.removeAttribute("data-paideia-container");
      targetElement?.removeAttribute("data-paideia-theme");
      targetElement?.removeAttribute("data-paideia-accent");
      targetElement = target;
      target.setAttribute("data-paideia-container", "ode-phase-portrait");
    },
    saveState(): ContainerEmbedState {
      return cloneState(state);
    },
    score() {
      return {
        completed: state.predictionCommitted,
        predictionCommitted: state.predictionCommitted,
        score: state.predictionCommitted ? 1 : 0,
      };
    },
    resume(nextState: ContainerEmbedState): void {
      state = cloneState(validateState(nextState));
    },
    syncTheme(nextTheme: ContainerEmbedTheme): void {
      const parsedTheme = EmbedThemeSpec.parse(nextTheme);
      targetElement?.setAttribute("data-paideia-theme", parsedTheme.colorScheme);
      if (parsedTheme.accentColor !== undefined) {
        targetElement?.setAttribute("data-paideia-accent", parsedTheme.accentColor);
      } else {
        targetElement?.removeAttribute("data-paideia-accent");
      }
    },
    destroy(): void {
      targetElement?.removeAttribute("data-paideia-container");
      targetElement?.removeAttribute("data-paideia-theme");
      targetElement?.removeAttribute("data-paideia-accent");
      targetElement = null;
      state = cloneState(defaultState);
    },
  };
};

export const createEmbed = createContainerEmbed;

export type { ContainerEmbedApi, ContainerEmbedState, ContainerEmbedTheme } from "./api.js";
