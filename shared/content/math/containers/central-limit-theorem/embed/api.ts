import type { CltSamplerState } from "@paideia/shared-sims/central-limit-theorem";

export interface CentralLimitTheoremEmbedState extends Partial<CltSamplerState> {
  readonly predictionCommitted: boolean;
}

export interface CentralLimitTheoremEmbedTheme {
  readonly colorScheme: "light" | "dark";
  readonly accentColor?: string;
}

export interface CentralLimitTheoremEmbedScore {
  readonly completed: boolean;
  readonly predictionCommitted: boolean;
  readonly score: number;
}

export interface CentralLimitTheoremEmbedApi {
  load(target: Element): Promise<void>;
  saveState(): CentralLimitTheoremEmbedState;
  score(): CentralLimitTheoremEmbedScore;
  resume(state: CentralLimitTheoremEmbedState): void;
  syncTheme(theme: CentralLimitTheoremEmbedTheme): void;
  destroy(): void;
}
