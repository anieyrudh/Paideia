export interface ResolvingVectorsEmbedState {
  readonly magnitudeNewtons: number;
  readonly angleDegrees: number;
  readonly predictionCommitted: boolean;
}

export interface ResolvingVectorsEmbedTheme {
  readonly colorScheme: "light" | "dark";
  readonly accentColor?: string;
}

export interface ResolvingVectorsEmbedScore {
  readonly completed: boolean;
  readonly predictionCommitted: boolean;
  readonly score: number;
}

export interface ResolvingVectorsEmbedApi {
  load(target: Element): Promise<void>;
  saveState(): ResolvingVectorsEmbedState;
  score(): ResolvingVectorsEmbedScore;
  resume(state: ResolvingVectorsEmbedState): void;
  syncTheme(theme: ResolvingVectorsEmbedTheme): void;
  destroy(): void;
}
