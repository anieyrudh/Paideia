export interface ContainerEmbedState {
  readonly predictionCommitted: boolean;
}

export interface ContainerEmbedTheme {
  readonly colorScheme: "light" | "dark";
  /** Reserved for future shell-level accent styling; current embeds sync only colorScheme. */
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
