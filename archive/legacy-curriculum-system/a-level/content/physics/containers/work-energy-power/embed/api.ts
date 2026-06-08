import type { WorkEnergyPowerState } from "@paideia/a-level-physics-sims/work-energy-power";

export interface WorkEnergyPowerEmbedState extends WorkEnergyPowerState {
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
