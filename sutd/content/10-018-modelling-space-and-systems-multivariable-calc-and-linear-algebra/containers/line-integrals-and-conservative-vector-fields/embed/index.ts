import type {
  LineIntegralsAndConservativeVectorFieldsScore,
  LineIntegralsAndConservativeVectorFieldsState,
} from "./api";

const defaults: LineIntegralsAndConservativeVectorFieldsState = {
  fieldKind: "conservative",
  curveKind: "direct",
  endX: 2,
  endY: 1,
  bend: 1,
  steps: 96,
};

export const load = (): LineIntegralsAndConservativeVectorFieldsState => defaults;
export const saveState = (state: LineIntegralsAndConservativeVectorFieldsState) => state;
export const resume = (state: Partial<LineIntegralsAndConservativeVectorFieldsState>) => ({
  ...defaults,
  ...state,
});
export const score = (
  state: LineIntegralsAndConservativeVectorFieldsState,
): LineIntegralsAndConservativeVectorFieldsScore => ({
  pathIndependenceRecognised: state.fieldKind === "conservative",
  evidenceRevealed: true,
});
export const syncTheme = () => undefined;
export const destroy = () => undefined;
