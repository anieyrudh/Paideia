export type EmbedRegressionDataset = "sensor" | "delivery" | "study";

export interface ContainerEmbedState {
  readonly predictionCommitted: boolean;
  readonly dataset: EmbedRegressionDataset;
  readonly outlierShift: number;
  readonly noiseLevel: number;
}

export interface ContainerEmbedTheme {
  readonly colorScheme: "light" | "dark";
  readonly accentColor?: string;
}

export interface ContainerEmbedScore {
  readonly completed: boolean;
  readonly predictionCommitted: boolean;
  readonly score: number;
}

export interface ContainerEmbedApi {
  load(target: Element): Promise<void>;
  saveState(): ContainerEmbedState;
  score(): ContainerEmbedScore;
  resume(state: ContainerEmbedState): void;
  syncTheme(theme: ContainerEmbedTheme): void;
  destroy(): void;
}
