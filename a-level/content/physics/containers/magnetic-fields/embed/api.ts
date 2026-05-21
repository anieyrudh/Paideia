export interface MagneticFieldsEmbedState {
  readonly fieldMilliTesla: number;
  readonly currentAmperes: number;
  readonly activeLengthCm: number;
  readonly angleDegrees: number;
  readonly particleChargeMicroC: number;
  readonly particleSpeedKmPerSecond: number;
  readonly particleMassMilligrams: number;
  readonly predictionCommitted: boolean;
}

export interface MagneticFieldsEmbedTheme {
  readonly colorScheme: "light" | "dark";
  readonly accentColor?: string;
}

export interface MagneticFieldsEmbedScore {
  readonly completed: boolean;
  readonly predictionCommitted: boolean;
  readonly score: number;
}

export interface MagneticFieldsEmbedApi {
  load(target: Element): Promise<void>;
  saveState(): MagneticFieldsEmbedState;
  score(): MagneticFieldsEmbedScore;
  resume(state: MagneticFieldsEmbedState): void;
  syncTheme(theme: MagneticFieldsEmbedTheme): void;
  destroy(): void;
}
