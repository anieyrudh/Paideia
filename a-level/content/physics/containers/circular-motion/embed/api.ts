import type { CircularMotionState } from "@paideia/a-level-physics-sims/circular-motion";

export interface CircularMotionEmbedState extends CircularMotionState {
  readonly predictionCommitted: boolean;
}

export interface CircularMotionEmbedTheme {
  readonly colorScheme: "light" | "dark";
  readonly accentColor?: string;
}

export interface CircularMotionEmbedScore {
  readonly completed: boolean;
  readonly predictionCommitted: boolean;
  readonly score: number;
}

export interface CircularMotionEmbedApi {
  load(target: Element): Promise<void>;
  saveState(): CircularMotionEmbedState;
  score(): CircularMotionEmbedScore;
  resume(state: CircularMotionEmbedState): void;
  syncTheme(theme: CircularMotionEmbedTheme): void;
  destroy(): void;
}
