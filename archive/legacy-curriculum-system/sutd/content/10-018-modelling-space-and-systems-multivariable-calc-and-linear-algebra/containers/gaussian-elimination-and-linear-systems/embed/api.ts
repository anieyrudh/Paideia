export type GaussianEliminationAndLinearSystemsState = {
  readonly a: number;
  readonly b: number;
  readonly c: number;
  readonly d: number;
  readonly e: number;
  readonly f: number;
};

export type GaussianEliminationAndLinearSystemsScore = {
  readonly uniqueDefaultRecognised: boolean;
  readonly evidenceRevealed: boolean;
};
