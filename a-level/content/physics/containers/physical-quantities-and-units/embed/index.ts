import type {
  PhysicalQuantitiesEmbedApi,
  PhysicalQuantitiesEmbedScore,
  PhysicalQuantitiesEmbedState,
  PhysicalQuantitiesEmbedTheme,
} from "./api.js";

const defaultState: PhysicalQuantitiesEmbedState = {
  scenarioId: "impossible-sum",
  leftQuantityId: "length",
  operation: "add",
  firstQuantityId: "speed",
  secondQuantityId: "time",
  predictionCommitted: false,
};

export const createPhysicalQuantitiesEmbed = (): PhysicalQuantitiesEmbedApi => {
  let state = defaultState;
  let targetElement: Element | null = null;
  let theme: PhysicalQuantitiesEmbedTheme = { colorScheme: "light" };

  return {
    async load(target: Element): Promise<void> {
      targetElement = target;
      targetElement.setAttribute("data-paideia-container", "physical-quantities-and-units");
      targetElement.setAttribute("data-paideia-sim", "dimensional-consistency-checker");
    },
    saveState(): PhysicalQuantitiesEmbedState {
      return state;
    },
    score(): PhysicalQuantitiesEmbedScore {
      return {
        completed: state.predictionCommitted,
        predictionCommitted: state.predictionCommitted,
        score: state.predictionCommitted ? 1 : 0,
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
      targetElement?.removeAttribute("data-paideia-sim");
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
