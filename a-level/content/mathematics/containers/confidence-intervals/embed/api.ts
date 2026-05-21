import type { ConfidenceIntervalsState } from "@paideia/a-level-math-sims/confidence-intervals";

export interface ConfidenceIntervalsEmbedState extends Partial<ConfidenceIntervalsState> {
  readonly predictionCommitted: boolean;
}

export interface ConfidenceIntervalsEmbedTheme {
  readonly colorScheme: "light" | "dark";
  readonly accentColor?: string;
}

export interface ConfidenceIntervalsEmbedScore {
  readonly completed: boolean;
  readonly predictionCommitted: boolean;
  readonly score: number;
}

export interface ConfidenceIntervalsEmbedApi {
  load(target: Element): Promise<void>;
  saveState(): ConfidenceIntervalsEmbedState;
  score(): ConfidenceIntervalsEmbedScore;
  resume(state: ConfidenceIntervalsEmbedState): void;
  syncTheme(theme: ConfidenceIntervalsEmbedTheme): void;
  destroy(): void;
}
