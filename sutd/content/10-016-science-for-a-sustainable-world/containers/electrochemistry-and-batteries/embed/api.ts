export type ElectrochemistryEmbedState = {
  readonly standardPotentialVolts: number;
  readonly reactionQuotient: number;
  readonly electronCount: number;
};

export const defaultState = (): ElectrochemistryEmbedState => ({
  standardPotentialVolts: 1.1,
  reactionQuotient: 1,
  electronCount: 2,
});

export const score = (state: ElectrochemistryEmbedState, predictionCommitted: boolean) => ({
  completion: predictionCommitted && state.reactionQuotient > 0 ? 1 : 0.4,
  predictionCommitted,
  evidenceInspected: state.electronCount >= 1,
});
