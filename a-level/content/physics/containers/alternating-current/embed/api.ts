import type { AlternatingCurrentState } from "@paideia/a-level-physics-sims/alternating-current";

export interface AlternatingCurrentEmbedState extends AlternatingCurrentState {
  readonly predictionCommitted: boolean;
}

export interface AlternatingCurrentEmbedTheme {
  readonly colorScheme: "light" | "dark";
  readonly accentColor?: string;
}

export interface AlternatingCurrentEmbedScore {
  readonly completed: boolean;
  readonly predictionCommitted: boolean;
  readonly score: number;
}

export interface AlternatingCurrentEmbedApi {
  load(target: Element): Promise<void>;
  saveState(): AlternatingCurrentEmbedState;
  score(): AlternatingCurrentEmbedScore;
  resume(state: AlternatingCurrentEmbedState): void;
  syncTheme(theme: AlternatingCurrentEmbedTheme): void;
  destroy(): void;
}
