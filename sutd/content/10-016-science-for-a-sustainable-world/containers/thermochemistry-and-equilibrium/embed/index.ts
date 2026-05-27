export type {
  ContainerEmbedApi,
  ContainerEmbedScore,
  ContainerEmbedState,
  ContainerEmbedTheme,
} from "./api.js";

export const createEmbedApi = (): ContainerEmbedApi => {
  let state: ContainerEmbedState = { predictionCommitted: false };

  return {
    async load(_target: Element): Promise<void> {
      state = { predictionCommitted: false };
    },
    saveState(): ContainerEmbedState {
      return state;
    },
    score(): ContainerEmbedScore {
      return {
        completed: state.predictionCommitted,
        predictionCommitted: state.predictionCommitted,
        score: state.predictionCommitted ? 1 : 0,
      };
    },
    resume(nextState: ContainerEmbedState): void {
      state = { predictionCommitted: nextState.predictionCommitted };
    },
    syncTheme(_theme: ContainerEmbedTheme): void {
      // Theme sync is owned by the host shell for this DOM-only simulation.
    },
    destroy(): void {
      state = { predictionCommitted: false };
    },
  };
};
