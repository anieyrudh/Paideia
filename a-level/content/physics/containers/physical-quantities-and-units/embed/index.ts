import type {
  PhysicalQuantitiesEmbedApi,
  PhysicalQuantitiesEmbedScore,
  PhysicalQuantitiesEmbedState,
  PhysicalQuantitiesEmbedTheme,
} from "./api.js";

const defaultState: PhysicalQuantitiesEmbedState = {
  selectedExample: "measurement-uncertainty-lab",
  completed: false,
  lab: {
    distanceCentimetres: 80,
    distanceUncertaintyMillimetres: 5,
    timeSeconds: 2,
    timeUncertaintySeconds: 0.1,
  },
};

export const createPhysicalQuantitiesEmbed = (): PhysicalQuantitiesEmbedApi => {
  let state = defaultState;
  let targetElement: Element | null = null;
  let theme: PhysicalQuantitiesEmbedTheme = { colorScheme: "light" };

  return {
    async load(target: Element): Promise<void> {
      targetElement = target;
      targetElement.setAttribute("data-paideia-container", "physical-quantities-and-units");
      targetElement.setAttribute("data-paideia-surface", "measurement-uncertainty-lab");
    },
    saveState(): PhysicalQuantitiesEmbedState {
      return state;
    },
    score(): PhysicalQuantitiesEmbedScore {
      return {
        completed: state.completed,
        score: state.completed ? 1 : 0,
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
      targetElement?.removeAttribute("data-paideia-surface");
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
