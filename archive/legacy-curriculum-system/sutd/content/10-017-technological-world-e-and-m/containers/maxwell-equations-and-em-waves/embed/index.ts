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

const defaultState: ContainerEmbedState = { predictionCommitted: false };

const parseState = (state: ContainerEmbedState): ContainerEmbedState =>
  Object.freeze(ContainerEmbedStateSchema.parse(state));
const parseTheme = (theme: ContainerEmbedTheme): ContainerEmbedTheme =>
  Object.freeze(ContainerEmbedThemeSchema.parse(theme));
const parseScore = (score: ContainerEmbedScore): ContainerEmbedScore =>
  Object.freeze(ContainerEmbedScoreSchema.parse(score));

export const createContainerEmbed = (): ContainerEmbedApi => {
  let state = parseState(defaultState);
  let targetElement: Element | null = null;

  return {
    async load(target: Element): Promise<void> {
      targetElement = target;
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
    syncTheme(theme: ContainerEmbedTheme): void {
      const parsedTheme = parseTheme(theme);
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
