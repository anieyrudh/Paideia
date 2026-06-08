import type { LinearProgrammingState } from "@paideia/shared-sims/linear-programming-feasible-region";

export interface ContainerEmbedState extends LinearProgrammingState {
  readonly predictionCommitted: boolean;
}

export interface ContainerEmbedTheme {
  readonly colorScheme: "light" | "dark";
  readonly accentColor?: string;
}

export interface ContainerEmbedScore {
  readonly completed: boolean;
  readonly predictionCommitted: boolean;
  readonly score: number;
}

export interface ContainerEmbedApi {
  load(target: Element): Promise<void>;
  saveState(): ContainerEmbedState;
  score(): ContainerEmbedScore;
  resume(state: ContainerEmbedState): void;
  syncTheme(theme: ContainerEmbedTheme): void;
  destroy(): void;
}
