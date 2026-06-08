export interface ContainerEmbedState {
  readonly predictionCommitted: boolean;
}

export interface ContainerEmbedTheme {
  readonly colorScheme?: "light" | "dark" | null;
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
  syncTheme(theme?: ContainerEmbedTheme | null): void;
  destroy(): void;
}
