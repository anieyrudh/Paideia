export type PolymersEmbedState = {
  readonly performanceGoal: "specific-strength" | "low-carbon-strength" | "low-carbon-stiffness";
  readonly collectionRatePercent: number;
  readonly reuseCycles: number;
};

export type PolymersEmbedScore = {
  readonly completion: number;
  readonly predictionCommitted: boolean;
  readonly evidenceInspected: boolean;
};

export const defaultState = (): PolymersEmbedState => ({
  performanceGoal: "low-carbon-strength",
  collectionRatePercent: 55,
  reuseCycles: 5,
});

export const score = (state: PolymersEmbedState, predictionCommitted: boolean): PolymersEmbedScore => ({
  completion: predictionCommitted && state.collectionRatePercent >= 0 ? 1 : 0.4,
  predictionCommitted,
  evidenceInspected: state.reuseCycles > 1,
});
