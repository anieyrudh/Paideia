export interface PhysicalQuantitiesEmbedState {
  readonly selectedScenario: string;
  readonly predictionCommitted: boolean;
  readonly completed: boolean;
}

export interface PhysicalQuantitiesEmbedTheme {
  readonly colorScheme: "light" | "dark";
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
