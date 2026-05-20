export type {
  CircuitsEmbedApi,
  CircuitsEmbedScore,
  CircuitsEmbedState,
  CircuitsEmbedTheme,
} from "./api.js";

import type {
  CircuitsEmbedApi,
  CircuitsEmbedScore,
  CircuitsEmbedState,
  CircuitsEmbedTheme,
} from "./api.js";

const defaultState: CircuitsEmbedState = {
  branchAResistanceOhms: 40,
  branchBResistanceOhms: 60,
  predictionCommitted: false,
  seriesResistanceOhms: 20,
  supplyVoltageVolts: 9,
};

const cloneState = (state: CircuitsEmbedState): CircuitsEmbedState => ({
  branchAResistanceOhms: state.branchAResistanceOhms,
  branchBResistanceOhms: state.branchBResistanceOhms,
  predictionCommitted: state.predictionCommitted,
  seriesResistanceOhms: state.seriesResistanceOhms,
  supplyVoltageVolts: state.supplyVoltageVolts,
});

export const createContainerEmbed = (): CircuitsEmbedApi => {
  let state = cloneState(defaultState);
  let targetElement: Element | null = null;

  return {
    async load(target: Element): Promise<void> {
      targetElement?.removeAttribute("data-paideia-theme");
      targetElement = target;
    },
    saveState(): CircuitsEmbedState {
      return cloneState(state);
    },
    score(): CircuitsEmbedScore {
      return {
        completed: state.predictionCommitted,
        predictionCommitted: state.predictionCommitted,
        score: state.predictionCommitted ? 1 : 0,
      };
    },
    resume(nextState: CircuitsEmbedState): void {
      state = cloneState(nextState);
    },
    syncTheme(theme: CircuitsEmbedTheme): void {
      targetElement?.setAttribute("data-paideia-theme", theme.colorScheme);
    },
    destroy(): void {
      targetElement?.removeAttribute("data-paideia-theme");
      targetElement = null;
      state = cloneState(defaultState);
    },
  };
};
