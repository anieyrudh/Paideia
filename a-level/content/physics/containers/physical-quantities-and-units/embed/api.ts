export interface PhysicalQuantitiesEmbedState {
  readonly scenarioId: string;
  readonly leftQuantityId: string;
  readonly operation: string;
  readonly firstQuantityId: string;
  readonly secondQuantityId: string;
  readonly predictionCommitted: boolean;
}

export interface PhysicalQuantitiesEmbedTheme {
  readonly colorScheme: "light" | "dark";
  readonly accentColor?: string;
}

export interface PhysicalQuantitiesEmbedScore {
  readonly completed: boolean;
  readonly predictionCommitted: boolean;
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
