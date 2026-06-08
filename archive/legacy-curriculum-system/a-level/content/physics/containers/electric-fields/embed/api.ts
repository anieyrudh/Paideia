import type { ElectricFieldsState } from "@paideia/a-level-physics-sims/electric-fields";

export interface ElectricFieldsEmbedState extends ElectricFieldsState {
  readonly predictionCommitted: boolean;
}

export interface ElectricFieldsEmbedTheme {
  readonly colorScheme: "light" | "dark";
  readonly accentColor?: string;
}

export interface ElectricFieldsEmbedScore {
  readonly completed: boolean;
  readonly predictionCommitted: boolean;
  readonly score: number;
}

export interface ElectricFieldsEmbedApi {
  load(target: Element): Promise<void>;
  saveState(): ElectricFieldsEmbedState;
  score(): ElectricFieldsEmbedScore;
  resume(state: ElectricFieldsEmbedState): void;
  syncTheme(theme: ElectricFieldsEmbedTheme): void;
  destroy(): void;
}
