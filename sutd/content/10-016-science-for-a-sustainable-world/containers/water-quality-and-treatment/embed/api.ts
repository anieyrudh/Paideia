export type WaterQualityAndTreatmentEmbedState = {
  readonly rawTurbidityNtu: number;
  readonly filterRemovalPercent: number;
  readonly chlorineMgPerLitre: number;
  readonly contactMinutes: number;
  readonly pH: number;
  readonly predictionCommitted: boolean;
};

export type WaterQualityAndTreatmentEmbedScore = {
  readonly complete: boolean;
  readonly finishedTurbidityNtu: number;
  readonly ctMgMinutesPerLitre: number;
  readonly meetsScreen: boolean;
};

export type WaterQualityAndTreatmentEmbedApi = {
  readonly load: (state?: Partial<WaterQualityAndTreatmentEmbedState>) => WaterQualityAndTreatmentEmbedState;
  readonly saveState: () => WaterQualityAndTreatmentEmbedState;
  readonly score: () => WaterQualityAndTreatmentEmbedScore;
  readonly resume: (state: Partial<WaterQualityAndTreatmentEmbedState>) => WaterQualityAndTreatmentEmbedState;
  readonly syncTheme: (theme: "light" | "dark") => void;
  readonly destroy: () => void;
};
