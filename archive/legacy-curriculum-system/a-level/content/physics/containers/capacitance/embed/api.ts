import type { CapacitanceState } from "@paideia/a-level-physics-sims/capacitance";

export interface CapacitanceEmbedState extends CapacitanceState {
  readonly predictionCommitted: boolean;
}

export interface CapacitanceEmbedTheme {
  readonly colorScheme: "light" | "dark";
  readonly accentColor?: string;
}

export interface CapacitanceEmbedScore {
  readonly completed: boolean;
  readonly predictionCommitted: boolean;
  readonly score: number;
}

export interface CapacitanceEmbedApi {
  load(target: Element): Promise<void>;
  saveState(): CapacitanceEmbedState;
  score(): CapacitanceEmbedScore;
  resume(state: CapacitanceEmbedState): void;
  syncTheme(theme: CapacitanceEmbedTheme): void;
  destroy(): void;
}
