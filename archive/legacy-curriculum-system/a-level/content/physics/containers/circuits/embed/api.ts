import type { CircuitState } from "@paideia/a-level-physics-sims/circuits";

export interface CircuitsEmbedState extends CircuitState {
  readonly predictionCommitted: boolean;
}

export interface CircuitsEmbedTheme {
  readonly colorScheme: "light" | "dark";
  readonly accentColor?: string;
}

export interface CircuitsEmbedScore {
  readonly completed: boolean;
  readonly predictionCommitted: boolean;
  readonly score: number;
}

export interface CircuitsEmbedApi {
  load(target: Element): Promise<void>;
  saveState(): CircuitsEmbedState;
  score(): CircuitsEmbedScore;
  resume(state: CircuitsEmbedState): void;
  syncTheme(theme: CircuitsEmbedTheme): void;
  destroy(): void;
}
