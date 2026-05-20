import type { WavesState } from "@paideia/a-level-physics-sims/waves";

export interface WavesEmbedState extends WavesState {
  readonly predictionCommitted: boolean;
}

export interface WavesEmbedTheme {
  readonly colorScheme: "light" | "dark";
  readonly accentColor?: string;
}

export interface WavesEmbedScore {
  readonly completed: boolean;
  readonly predictionCommitted: boolean;
  readonly score: number;
}

export interface WavesEmbedApi {
  load(target: Element): Promise<void>;
  saveState(): WavesEmbedState;
  score(): WavesEmbedScore;
  resume(state: WavesEmbedState): void;
  syncTheme(theme: WavesEmbedTheme): void;
  destroy(): void;
}
