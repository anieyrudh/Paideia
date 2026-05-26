import type {
  ContainerEmbedApi,
  ContainerEmbedScore,
  ContainerEmbedState,
  ContainerEmbedTheme,
} from "./api.js";
import {
  ContainerEmbedScoreSchema,
  ContainerEmbedStateSchema,
  ContainerEmbedThemeSchema,
} from "./api.js";

const defaultState: ContainerEmbedState = {
  predictionCommitted: false,
};

const parseState = (state: ContainerEmbedState): ContainerEmbedState =>
  Object.freeze(ContainerEmbedStateSchema.parse(state));

const parseTheme = (theme: ContainerEmbedTheme): ContainerEmbedTheme =>
  Object.freeze(ContainerEmbedThemeSchema.parse(theme));

const parseScore = (score: ContainerEmbedScore): ContainerEmbedScore =>
  Object.freeze(ContainerEmbedScoreSchema.parse(score));

export const createContainerEmbed = (): ContainerEmbedApi => {
  let state = parseState(defaultState);
  let targetElement: Element | null = null;
  let theme: ContainerEmbedTheme | null = null;

  const clearTheme = (target: Element): void => {
    target.removeAttribute("data-paideia-theme");
    target.removeAttribute("data-paideia-accent-color");
  };

  const applyTheme = (): void => {
    if (targetElement === null || theme === null) return;
    targetElement.setAttribute("data-paideia-theme", theme.colorScheme);
    if (theme.accentColor === undefined) {
      targetElement.removeAttribute("data-paideia-accent-color");
    } else {
      targetElement.setAttribute("data-paideia-accent-color", theme.accentColor);
    }
  };

  return {
    async load(target: Element): Promise<void> {
      if (targetElement !== null && targetElement !== target) {
        clearTheme(targetElement);
      }
      targetElement = target;
      applyTheme();
    },
    saveState(): ContainerEmbedState {
      return parseState(state);
    },
    score(): ContainerEmbedScore {
      return parseScore({
        completed: state.predictionCommitted,
        predictionCommitted: state.predictionCommitted,
        score: state.predictionCommitted ? 1 : 0,
      });
    },
    resume(nextState: ContainerEmbedState): void {
      state = parseState(nextState);
    },
    syncTheme(nextTheme: ContainerEmbedTheme): void {
      const parsedTheme = parseTheme(nextTheme);
      theme = parsedTheme;
      applyTheme();
    },
    destroy(): void {
      if (targetElement !== null) clearTheme(targetElement);
      targetElement = null;
      theme = null;
      state = parseState(defaultState);
    },
  };
};

export type {
  ContainerEmbedApi,
  ContainerEmbedScore,
  ContainerEmbedState,
  ContainerEmbedTheme,
};
