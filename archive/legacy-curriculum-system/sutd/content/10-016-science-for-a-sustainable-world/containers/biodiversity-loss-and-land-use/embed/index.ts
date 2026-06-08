import {
  type BiodiversityLossAndLandUseEmbedApi,
  type BiodiversityLossAndLandUseEmbedScore,
  type BiodiversityLossAndLandUseEmbedState,
} from "./api";

const defaults: BiodiversityLossAndLandUseEmbedState = {
  habitatPercent: 80,
  conversionPercentPerYear: 2,
  restorationPercentPerYear: 0.5,
  sensitivity: 1.4,
  predictionCommitted: false,
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));

const normalise = (
  state: Partial<BiodiversityLossAndLandUseEmbedState> = {},
): BiodiversityLossAndLandUseEmbedState => ({
  habitatPercent: clamp(state.habitatPercent ?? defaults.habitatPercent, 20, 100),
  conversionPercentPerYear: clamp(state.conversionPercentPerYear ?? defaults.conversionPercentPerYear, 0, 6),
  restorationPercentPerYear: clamp(state.restorationPercentPerYear ?? defaults.restorationPercentPerYear, 0, 4),
  sensitivity: clamp(state.sensitivity ?? defaults.sensitivity, 0.6, 2.2),
  predictionCommitted: state.predictionCommitted ?? defaults.predictionCommitted,
});

export const createBiodiversityLossAndLandUseEmbed = (): BiodiversityLossAndLandUseEmbedApi => {
  let current = defaults;
  const score = (): BiodiversityLossAndLandUseEmbedScore => {
    const netConversionPercentPerYear =
      current.conversionPercentPerYear - current.restorationPercentPerYear;
    const pressure = netConversionPercentPerYear * current.sensitivity;
    return {
      complete: current.predictionCommitted,
      netConversionPercentPerYear,
      risk: pressure > 5 ? "high" : pressure > 2 ? "moderate" : "low",
    };
  };
  return {
    load: (state) => {
      current = normalise(state);
      return current;
    },
    saveState: () => current,
    score,
    resume: (state) => {
      current = normalise({ ...current, ...state });
      return current;
    },
    syncTheme: () => undefined,
    destroy: () => undefined,
  };
};

export type {
  BiodiversityLossAndLandUseEmbedApi,
  BiodiversityLossAndLandUseEmbedScore,
  BiodiversityLossAndLandUseEmbedState,
};
