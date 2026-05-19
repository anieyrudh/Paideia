export interface ScalarsVectorsEmbedState {
  readonly vectorA: number;
  readonly vectorB: number;
  readonly angleDegrees: number;
  readonly predictionCommitted: boolean;
}

export interface ScalarsVectorsEmbedTheme {
  readonly colorScheme: "light" | "dark";
  readonly accentColor?: string;
}

export interface ScalarsVectorsEmbedScore {
  readonly completed: boolean;
  readonly predictionCommitted: boolean;
  readonly score: number;
}

export interface ScalarsVectorsEmbedApi {
  load(target: Element): Promise<void>;
  saveState(): ScalarsVectorsEmbedState;
  score(): ScalarsVectorsEmbedScore;
  resume(state: ScalarsVectorsEmbedState): void;
  syncTheme(theme: ScalarsVectorsEmbedTheme): void;
  destroy(): void;
}
