import type {
  PhysicalQuantitiesEmbedApi,
  PhysicalQuantitiesEmbedScore,
  PhysicalQuantitiesEmbedState,
  PhysicalQuantitiesEmbedTheme,
} from "./api.js";

const defaultState: PhysicalQuantitiesEmbedState = {
  selectedEquation: "missing-time-factor",
  predictionCommitted: false,
  completed: false,
};

export const createPhysicalQuantitiesEmbed = (): PhysicalQuantitiesEmbedApi => {
  let state = defaultState;
  let targetElement: Element | null = null;
  let theme: PhysicalQuantitiesEmbedTheme = { colorScheme: "light" };

  return {
    async load(target: Element): Promise<void> {
      targetElement = target;
      targetElement.setAttribute("data-paideia-container", "physical-quantities-and-units");
    },
    saveState(): PhysicalQuantitiesEmbedState {
      return state;
    },
    score(): PhysicalQuantitiesEmbedScore {
      return {
        completed: state.completed,
        predictionCommitted: state.predictionCommitted,
        score: state.completed ? 1 : state.predictionCommitted ? 0.5 : 0,
      };
    },
    resume(nextState: PhysicalQuantitiesEmbedState): void {
      state = nextState;
    },
    syncTheme(nextTheme: PhysicalQuantitiesEmbedTheme): void {
      theme = nextTheme;
      targetElement?.setAttribute("data-paideia-theme", theme.colorScheme);
    },
    destroy(): void {
      targetElement?.removeAttribute("data-paideia-container");
      targetElement?.removeAttribute("data-paideia-theme");
      targetElement = null;
      state = defaultState;
    },
  };
};

export type {
  PhysicalQuantitiesEmbedApi,
  PhysicalQuantitiesEmbedScore,
  PhysicalQuantitiesEmbedState,
  PhysicalQuantitiesEmbedTheme,
};
