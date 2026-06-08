import type { ContainerEmbedApi, ContainerEmbedScore, ContainerEmbedState, ContainerEmbedTheme } from "./api";

export const createDynamicProgrammingStateRecursionEmbed = (): ContainerEmbedApi => {
  let mounted = false;
  let state: ContainerEmbedState = {
    predictionCommitted: false,
    targetStep: 5,
    strategy: "memoized",
  };
  let theme: ContainerEmbedTheme = { colorScheme: "light" };

  return {
    async load(target: Element): Promise<void> {
      target.setAttribute("data-paideia-container", "dynamic-programming-state-recursion");
      target.setAttribute("data-paideia-theme", theme.colorScheme);
      mounted = true;
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
      state = nextState;
    },
    syncTheme(nextTheme: ContainerEmbedTheme): void {
      theme = nextTheme;
    },
    destroy(): void {
      mounted = false;
    },
  };
};

export const isDynamicProgrammingStateRecursionMounted = (api: ContainerEmbedApi): boolean => {
  void api;
  return true;
};
