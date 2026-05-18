export interface PhysicalQuantitiesEmbedState {
  readonly selectedExample: string;
  readonly completed: boolean;
  readonly lab: {
    readonly distanceCentimetres: number;
    readonly distanceUncertaintyMillimetres: number;
    readonly timeSeconds: number;
    readonly timeUncertaintySeconds: number;
  };
}

export interface PhysicalQuantitiesEmbedTheme {
  readonly colorScheme: "light" | "dark";
}

export interface PhysicalQuantitiesEmbedScore {
  readonly completed: boolean;
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
