import type {
  PhysicalQuantitiesEmbedApi,
  PhysicalQuantitiesEmbedScore,
  PhysicalQuantitiesEmbedState,
  PhysicalQuantitiesEmbedTheme,
} from "./api.js";

const defaultState: PhysicalQuantitiesEmbedState = {
  selectedCard: "acceleration",
  attemptedCards: [],
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
      const attemptedCards = state.attemptedCards.length;
      return {
        completed: state.completed,
        predictionCommitted: state.predictionCommitted,
        attemptedCards,
        score: state.completed ? 1 : attemptedCards / 7,
      };
    },
    resume(nextState: PhysicalQuantitiesEmbedState): void {
      state = nextState;
    },
    syncTheme(nextTheme: PhysicalQuantitiesEmbedTheme): void {
      theme = nextTheme;
      targetElement?.setAttribute("data-paideia-theme", theme.colorScheme);
      if (theme.accentColor !== undefined) {
        targetElement?.setAttribute("data-paideia-accent", theme.accentColor);
      }
    },
    destroy(): void {
      targetElement?.removeAttribute("data-paideia-container");
      targetElement?.removeAttribute("data-paideia-theme");
      targetElement?.removeAttribute("data-paideia-accent");
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
