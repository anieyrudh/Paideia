import type { ProbabilityStatisticsState } from "@paideia/a-level-math-sims/probability-statistics";

export interface ProbabilityStatisticsEmbedState extends Partial<ProbabilityStatisticsState> {
  readonly predictionCommitted: boolean;
}

export interface ProbabilityStatisticsEmbedTheme {
  readonly colorScheme: "light" | "dark";
  readonly accentColor?: string;
}

export interface ProbabilityStatisticsEmbedScore {
  readonly completed: boolean;
  readonly predictionCommitted: boolean;
  readonly score: number;
}

export interface ProbabilityStatisticsEmbedApi {
  load(target: Element): Promise<void>;
  saveState(): ProbabilityStatisticsEmbedState;
  score(): ProbabilityStatisticsEmbedScore;
  resume(state: ProbabilityStatisticsEmbedState): void;
  syncTheme(theme: ProbabilityStatisticsEmbedTheme): void;
  destroy(): void;
}
