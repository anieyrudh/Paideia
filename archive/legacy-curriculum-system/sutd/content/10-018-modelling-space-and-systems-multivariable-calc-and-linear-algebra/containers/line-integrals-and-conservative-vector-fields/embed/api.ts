export type LineIntegralsAndConservativeVectorFieldsState = {
  readonly fieldKind: "conservative" | "rotational";
  readonly curveKind: "direct" | "elbow";
  readonly endX: number;
  readonly endY: number;
  readonly bend: number;
  readonly steps: number;
};

export type LineIntegralsAndConservativeVectorFieldsScore = {
  readonly pathIndependenceRecognised: boolean;
  readonly evidenceRevealed: boolean;
};
