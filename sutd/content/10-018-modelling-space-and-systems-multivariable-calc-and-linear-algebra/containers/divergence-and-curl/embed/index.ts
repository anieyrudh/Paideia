import type { DivergenceAndCurlScore, DivergenceAndCurlState } from "./api";

const defaults: DivergenceAndCurlState = {
  fieldKind: "vortex",
  sampleX: 0,
  sampleY: 0,
  strength: 1,
};

export const load = (): DivergenceAndCurlState => defaults;
export const saveState = (state: DivergenceAndCurlState) => state;
export const resume = (state: Partial<DivergenceAndCurlState>) => ({ ...defaults, ...state });
export const score = (state: DivergenceAndCurlState): DivergenceAndCurlScore => ({
  diagnosticContrastVisible: state.fieldKind === "vortex" || state.fieldKind === "source",
  evidenceRevealed: true,
});
export const syncTheme = () => undefined;
export const destroy = () => undefined;
