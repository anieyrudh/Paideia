import type {
  PhysicalQuantitiesEmbedApi,
  PhysicalQuantitiesEmbedScore,
  PhysicalQuantitiesEmbedState,
  PhysicalQuantitiesEmbedTheme,
} from "./api.js";

const defaultState: PhysicalQuantitiesEmbedState = {
  selectedPreset: "card-length",
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
      targetElement.setAttribute("data-paideia-sim", "measurement-uncertainty-lab");
    },
    saveState(): PhysicalQuantitiesEmbedState {
      return state;
    },
    score(): PhysicalQuantitiesEmbedScore {
      const score = state.completed ? 1 : state.predictionCommitted ? 0.5 : 0;
      return {
        completed: state.completed,
        predictionCommitted: state.predictionCommitted,
        score,
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
