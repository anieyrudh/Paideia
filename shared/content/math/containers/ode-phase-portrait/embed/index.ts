import type { ContainerEmbedApi, ContainerEmbedState, ContainerEmbedTheme } from "./api.js";

export const createEmbed = (): ContainerEmbedApi => {
  let mounted = false;
  let predictionCommitted = false;
  let theme: ContainerEmbedTheme = { colorScheme: "light" };

  return {
    async load(target: Element): Promise<void> {
      target.setAttribute("data-paideia-container", "ode-phase-portrait");
      mounted = true;
    },
    saveState(): ContainerEmbedState {
      return { predictionCommitted };
    },
    score() {
      return {
        completed: mounted && predictionCommitted,
        predictionCommitted,
        score: mounted && predictionCommitted ? 1 : 0,
      };
    },
    resume(state: ContainerEmbedState): void {
      predictionCommitted = state.predictionCommitted;
    },
    syncTheme(nextTheme: ContainerEmbedTheme): void {
      theme = nextTheme;
      void theme;
    },
    destroy(): void {
      mounted = false;
      predictionCommitted = false;
    },
  };
};

export type { ContainerEmbedApi, ContainerEmbedState, ContainerEmbedTheme } from "./api.js";
