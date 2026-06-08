export type BiodiversityLossAndLandUseEmbedState = {
  readonly habitatPercent: number;
  readonly conversionPercentPerYear: number;
  readonly restorationPercentPerYear: number;
  readonly sensitivity: number;
  readonly predictionCommitted: boolean;
};

export type BiodiversityLossAndLandUseEmbedScore = {
  readonly complete: boolean;
  readonly netConversionPercentPerYear: number;
  readonly risk: "low" | "moderate" | "high";
};

export type BiodiversityLossAndLandUseEmbedApi = {
  readonly load: (state?: Partial<BiodiversityLossAndLandUseEmbedState>) => BiodiversityLossAndLandUseEmbedState;
  readonly saveState: () => BiodiversityLossAndLandUseEmbedState;
  readonly score: () => BiodiversityLossAndLandUseEmbedScore;
  readonly resume: (state: Partial<BiodiversityLossAndLandUseEmbedState>) => BiodiversityLossAndLandUseEmbedState;
  readonly syncTheme: (theme: "light" | "dark") => void;
  readonly destroy: () => void;
};
