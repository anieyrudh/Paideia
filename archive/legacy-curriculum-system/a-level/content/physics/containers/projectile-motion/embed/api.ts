export interface ProjectileMotionEmbedState {
  readonly launchSpeedMetresPerSecond: number;
  readonly launchAngleDegrees: number;
  readonly launchHeightMetres: number;
  readonly predictionCommitted: boolean;
}

export interface ProjectileMotionEmbedTheme {
  readonly colorScheme: "light" | "dark";
  readonly accentColor?: string;
}

export interface ProjectileMotionEmbedScore {
  readonly completed: boolean;
  readonly predictionCommitted: boolean;
  readonly score: number;
}

export interface ProjectileMotionEmbedApi {
  load(target: Element): Promise<void>;
  saveState(): ProjectileMotionEmbedState;
  score(): ProjectileMotionEmbedScore;
  resume(state: ProjectileMotionEmbedState): void;
  syncTheme(theme: ProjectileMotionEmbedTheme): void;
  destroy(): void;
}
