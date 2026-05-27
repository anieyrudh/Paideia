import {
  type WaterQualityAndTreatmentEmbedApi,
  type WaterQualityAndTreatmentEmbedScore,
  type WaterQualityAndTreatmentEmbedState,
} from "./api";

const defaults: WaterQualityAndTreatmentEmbedState = {
  rawTurbidityNtu: 80,
  filterRemovalPercent: 90,
  chlorineMgPerLitre: 1.2,
  contactMinutes: 30,
  pH: 7.2,
  predictionCommitted: false,
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));

const normalise = (
  state: Partial<WaterQualityAndTreatmentEmbedState> = {},
): WaterQualityAndTreatmentEmbedState => ({
  rawTurbidityNtu: clamp(state.rawTurbidityNtu ?? defaults.rawTurbidityNtu, 5, 150),
  filterRemovalPercent: clamp(state.filterRemovalPercent ?? defaults.filterRemovalPercent, 40, 98),
  chlorineMgPerLitre: clamp(state.chlorineMgPerLitre ?? defaults.chlorineMgPerLitre, 0.1, 3),
  contactMinutes: clamp(state.contactMinutes ?? defaults.contactMinutes, 5, 90),
  pH: clamp(state.pH ?? defaults.pH, 4.5, 10),
  predictionCommitted: state.predictionCommitted ?? defaults.predictionCommitted,
});

export const createWaterQualityAndTreatmentEmbed = (): WaterQualityAndTreatmentEmbedApi => {
  let current = defaults;

  const score = (): WaterQualityAndTreatmentEmbedScore => {
    const finishedTurbidityNtu =
      current.rawTurbidityNtu * (1 - current.filterRemovalPercent / 100);
    const ctMgMinutesPerLitre = current.chlorineMgPerLitre * current.contactMinutes;
    return {
      complete: current.predictionCommitted,
      finishedTurbidityNtu,
      ctMgMinutesPerLitre,
      meetsScreen:
        finishedTurbidityNtu <= 5 &&
        ctMgMinutesPerLitre >= 120 &&
        current.pH >= 6.5 &&
        current.pH <= 8.5,
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
  WaterQualityAndTreatmentEmbedApi,
  WaterQualityAndTreatmentEmbedScore,
  WaterQualityAndTreatmentEmbedState,
};
