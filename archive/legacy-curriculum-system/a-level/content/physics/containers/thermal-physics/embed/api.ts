import type { ThermalPhysicsState } from "@paideia/a-level-physics-sims/thermal-physics";

export interface ThermalPhysicsEmbedState extends ThermalPhysicsState {
  readonly predictionCommitted: boolean;
}

export interface ThermalPhysicsEmbedTheme {
  readonly colorScheme: "light" | "dark";
  readonly accentColor?: string;
}

export interface ThermalPhysicsEmbedScore {
  readonly completed: boolean;
  readonly predictionCommitted: boolean;
  readonly score: number;
}

export interface ThermalPhysicsEmbedApi {
  load(target: Element): Promise<void>;
  saveState(): ThermalPhysicsEmbedState;
  score(): ThermalPhysicsEmbedScore;
  resume(state: ThermalPhysicsEmbedState): void;
  syncTheme(theme: ThermalPhysicsEmbedTheme): void;
  destroy(): void;
}
