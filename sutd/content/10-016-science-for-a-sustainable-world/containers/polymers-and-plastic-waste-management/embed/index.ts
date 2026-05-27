import { defaultState, score, type PolymersEmbedState } from "./api.js";

let currentState: PolymersEmbedState = defaultState();

export const load = () => currentState;

export const saveState = (state: Partial<PolymersEmbedState>) => {
  currentState = { ...currentState, ...state };
  return currentState;
};

export const resume = (state: PolymersEmbedState) => {
  currentState = state;
  return currentState;
};

export const syncTheme = () => ({ ok: true });

export const destroy = () => {
  currentState = defaultState();
};

export { score };
