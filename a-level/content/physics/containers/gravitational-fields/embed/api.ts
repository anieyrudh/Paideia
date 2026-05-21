import type { GravitationalFieldsState } from "@paideia/a-level-physics-sims/gravitational-fields";

export interface GravitationalFieldsEmbedState extends GravitationalFieldsState {
  readonly predictionCommitted: boolean;
}

export interface GravitationalFieldsEmbedTheme {
  readonly colorScheme: "light" | "dark";
  readonly accentColor?: string;
}

export interface GravitationalFieldsEmbedScore {
  readonly completed: boolean;
  readonly predictionCommitted: boolean;
  readonly score: number;
}

export interface GravitationalFieldsEmbedApi {
  load(target: Element): Promise<void>;
  saveState(): GravitationalFieldsEmbedState;
  score(): GravitationalFieldsEmbedScore;
  resume(state: GravitationalFieldsEmbedState): void;
  syncTheme(theme: GravitationalFieldsEmbedTheme): void;
  destroy(): void;
}
