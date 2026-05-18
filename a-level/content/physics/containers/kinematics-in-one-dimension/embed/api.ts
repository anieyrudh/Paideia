export interface KinematicsEmbedState {
  readonly initialVelocityMetresPerSecond: number;
  readonly accelerationMetresPerSecondSquared: number;
  readonly elapsedSeconds: number;
  readonly predictionCommitted: boolean;
}

export interface KinematicsEmbedTheme {
  readonly colorScheme: "light" | "dark";
  readonly accentColor?: string;
}

export interface KinematicsEmbedScore {
  readonly completed: boolean;
  readonly predictionCommitted: boolean;
  readonly score: number;
}

export interface KinematicsEmbedApi {
  load(target: Element): Promise<void>;
  saveState(): KinematicsEmbedState;
  score(): KinematicsEmbedScore;
  resume(state: KinematicsEmbedState): void;
  syncTheme(theme: KinematicsEmbedTheme): void;
  destroy(): void;
}
