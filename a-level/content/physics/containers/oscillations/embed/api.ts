import type { OscillationsState } from "@paideia/a-level-physics-sims/oscillations";

export interface OscillationsEmbedState extends OscillationsState {
  readonly predictionCommitted: boolean;
}

export interface OscillationsEmbedTheme {
  readonly colorScheme: "light" | "dark";
  readonly accentColor?: string;
}

export interface OscillationsEmbedScore {
  readonly completed: boolean;
  readonly predictionCommitted: boolean;
  readonly score: number;
}

export interface OscillationsEmbedApi {
  load(target: Element): Promise<void>;
  saveState(): OscillationsEmbedState;
  score(): OscillationsEmbedScore;
  resume(state: OscillationsEmbedState): void;
  syncTheme(theme: OscillationsEmbedTheme): void;
  destroy(): void;
}
