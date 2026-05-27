import { defaultState, score, type ElectrochemistryEmbedState } from "./api.js";

let currentState: ElectrochemistryEmbedState = defaultState();

export const load = () => currentState;

export const saveState = (state: Partial<ElectrochemistryEmbedState>) => {
  currentState = { ...currentState, ...state };
  return currentState;
};

export const resume = (state: ElectrochemistryEmbedState) => {
  currentState = state;
  return currentState;
};

export const syncTheme = () => ({ ok: true });

export const destroy = () => {
  currentState = defaultState();
};

export { score };
