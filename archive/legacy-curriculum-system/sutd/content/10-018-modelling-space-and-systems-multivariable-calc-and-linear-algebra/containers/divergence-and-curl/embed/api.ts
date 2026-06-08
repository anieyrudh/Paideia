export type DivergenceAndCurlState = {
  readonly fieldKind: "source" | "sink" | "vortex" | "shear";
  readonly sampleX: number;
  readonly sampleY: number;
  readonly strength: number;
};

export type DivergenceAndCurlScore = {
  readonly diagnosticContrastVisible: boolean;
  readonly evidenceRevealed: boolean;
};
