export interface ContainerEmbedState {
  readonly predictionCommitted: boolean;
  readonly landscape: "bowl" | "ravine" | "saddle";
  readonly startX: number;
  readonly startY: number;
  readonly learningRate: number;
  readonly maxSteps: number;
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
