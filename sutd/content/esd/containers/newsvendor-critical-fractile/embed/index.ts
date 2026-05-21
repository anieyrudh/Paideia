import type {
  ContainerEmbedApi,
  ContainerEmbedScore,
  ContainerEmbedState,
  ContainerEmbedTheme,
  EmbedDemandScenario,
} from "./api.js";

const defaultState: ContainerEmbedState = {
  predictionCommitted: false,
  scenario: "steady",
  orderQuantity: 90,
  underageCost: 18,
  overageCost: 6,
};

const isScenario = (value: string): value is EmbedDemandScenario =>
  value === "steady" || value === "launch" || value === "volatile";

const finiteInRange = (value: number, fallback: number, min: number, max: number): number =>
  Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;

const cloneState = (state: ContainerEmbedState): ContainerEmbedState => ({
  predictionCommitted: state.predictionCommitted,
  scenario: isScenario(state.scenario) ? state.scenario : defaultState.scenario,
  orderQuantity: finiteInRange(state.orderQuantity, defaultState.orderQuantity, 40, 150),
  underageCost: finiteInRange(state.underageCost, defaultState.underageCost, 2, 30),
  overageCost: finiteInRange(state.overageCost, defaultState.overageCost, 2, 30),
});

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
      state = cloneState(nextState);
    },
    syncTheme(theme: ContainerEmbedTheme): void {
      targetElement?.setAttribute("data-paideia-theme", theme.colorScheme);
      if (theme.accentColor !== undefined) {
        targetElement?.setAttribute("data-paideia-accent", theme.accentColor);
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
  ContainerEmbedApi,
  ContainerEmbedScore,
  ContainerEmbedState,
  ContainerEmbedTheme,
};
