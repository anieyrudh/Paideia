export interface ContainerEmbedState {
  readonly predictionCommitted: boolean;
  readonly inputSize: number;
  readonly branchingFactor: 2 | 3;
  readonly shrinkFactor: 2 | 3;
  readonly combineExponent: 0 | 1 | 2;
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
