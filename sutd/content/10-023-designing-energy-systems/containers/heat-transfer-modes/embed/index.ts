import type {
  ContainerEmbedApi,
  ContainerEmbedScore,
  ContainerEmbedState,
  ContainerEmbedTheme,
} from "./api.js";

export const createEmbed = (): ContainerEmbedApi => {
  let mounted = false;
  let predictionCommitted = false;

  return {
    async load(target: Element): Promise<void> {
      target.setAttribute("data-paideia-container", "heat-transfer-modes");
      mounted = true;
    },
    saveState(): ContainerEmbedState {
      return { predictionCommitted };
    },
    score(): ContainerEmbedScore {
      return {
        completed: mounted && predictionCommitted,
        predictionCommitted,
        score: predictionCommitted ? 1 : 0,
      };
    },
    resume(state: ContainerEmbedState): void {
      predictionCommitted = state.predictionCommitted;
    },
    syncTheme(_theme: ContainerEmbedTheme): void {
      // Theme propagation is owned by the embedding host.
    },
    destroy(): void {
      mounted = false;
    },
  };
};

export type {
  ContainerEmbedApi,
  ContainerEmbedScore,
  ContainerEmbedState,
  ContainerEmbedTheme,
} from "./api.js";
