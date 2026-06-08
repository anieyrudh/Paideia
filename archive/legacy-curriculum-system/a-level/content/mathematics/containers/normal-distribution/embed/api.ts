import type { NormalAreaMode, NormalDistributionState } from "@paideia/a-level-math-sims/normal-distribution";

export interface NormalDistributionEmbedState extends Partial<NormalDistributionState> {
  readonly predictionCommitted: boolean;
}

export interface NormalDistributionEmbedTheme {
  readonly colorScheme: "light" | "dark";
  readonly accentColor?: string;
}

export interface NormalDistributionEmbedScore {
  readonly completed: boolean;
  readonly predictionCommitted: boolean;
  readonly score: number;
}

export interface NormalDistributionEmbedApi {
  load(target: Element): Promise<void>;
  saveState(): NormalDistributionEmbedState;
  score(): NormalDistributionEmbedScore;
  resume(state: NormalDistributionEmbedState): void;
  syncTheme(theme: NormalDistributionEmbedTheme): void;
  destroy(): void;
}

export type { NormalAreaMode };
