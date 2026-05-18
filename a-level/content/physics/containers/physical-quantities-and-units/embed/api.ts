export interface PhysicalQuantitiesEmbedState {
  readonly selectedCard: string;
  readonly attemptedCards: readonly string[];
  readonly predictionCommitted: boolean;
  readonly completed: boolean;
}

export interface PhysicalQuantitiesEmbedTheme {
  readonly colorScheme: "light" | "dark";
  readonly accentColor?: string;
}

export interface PhysicalQuantitiesEmbedScore {
  readonly completed: boolean;
  readonly predictionCommitted: boolean;
  readonly attemptedCards: number;
  readonly score: number;
}

export interface PhysicalQuantitiesEmbedApi {
  load(target: Element): Promise<void>;
  saveState(): PhysicalQuantitiesEmbedState;
  score(): PhysicalQuantitiesEmbedScore;
  resume(state: PhysicalQuantitiesEmbedState): void;
  syncTheme(theme: PhysicalQuantitiesEmbedTheme): void;
  destroy(): void;
}
