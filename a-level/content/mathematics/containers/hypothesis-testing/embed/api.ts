import type { HypothesisTestingState } from "@paideia/a-level-math-sims/hypothesis-testing";

export interface HypothesisTestingEmbedState extends Partial<HypothesisTestingState> {
  readonly predictionCommitted: boolean;
}

export interface HypothesisTestingEmbedTheme {
  readonly colorScheme: "light" | "dark";
  readonly accentColor?: string;
}

export interface HypothesisTestingEmbedScore {
  readonly completed: boolean;
  readonly predictionCommitted: boolean;
  readonly score: number;
}

export interface HypothesisTestingEmbedApi {
  load(target: Element): Promise<void>;
  saveState(): HypothesisTestingEmbedState;
  score(): HypothesisTestingEmbedScore;
  resume(state: HypothesisTestingEmbedState): void;
  syncTheme(theme: HypothesisTestingEmbedTheme): void;
  destroy(): void;
}
