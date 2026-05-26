import type {
  GaussianEliminationAndLinearSystemsScore,
  GaussianEliminationAndLinearSystemsState,
} from "./api";

const defaults: GaussianEliminationAndLinearSystemsState = { a: 2, b: 1, c: 1, d: -1, e: 5, f: 1 };

export const load = (): GaussianEliminationAndLinearSystemsState => defaults;
export const saveState = (state: GaussianEliminationAndLinearSystemsState) => state;
export const resume = (state: Partial<GaussianEliminationAndLinearSystemsState>) => ({ ...defaults, ...state });
export const score = (state: GaussianEliminationAndLinearSystemsState): GaussianEliminationAndLinearSystemsScore => ({
  uniqueDefaultRecognised: state.a === 2 && state.d === -1,
  evidenceRevealed: true,
});
export const syncTheme = () => undefined;
export const destroy = () => undefined;
