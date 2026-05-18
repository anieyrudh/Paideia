export interface PhysicalQuantitiesEmbedState {
  readonly selectedPreset: "card-length" | "toy-car-track" | "pendulum-path";
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
