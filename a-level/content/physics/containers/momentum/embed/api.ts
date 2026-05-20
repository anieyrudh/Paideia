import type { MomentumState } from "@paideia/a-level-physics-sims/momentum";

export interface WorkEnergyPowerEmbedState extends MomentumState {
  readonly predictionCommitted: boolean;
}

export interface WorkEnergyPowerEmbedTheme {
  readonly colorScheme: "light" | "dark";
  readonly accentColor?: string;
}

export interface WorkEnergyPowerEmbedScore {
  readonly completed: boolean;
  readonly predictionCommitted: boolean;
  readonly score: number;
}

export interface WorkEnergyPowerEmbedApi {
  load(target: Element): Promise<void>;
  saveState(): WorkEnergyPowerEmbedState;
  score(): WorkEnergyPowerEmbedScore;
  resume(state: WorkEnergyPowerEmbedState): void;
  syncTheme(theme: WorkEnergyPowerEmbedTheme): void;
  destroy(): void;
}
