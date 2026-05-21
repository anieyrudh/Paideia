import type { ContainerEmbedApi, ContainerEmbedScore, ContainerEmbedState, ContainerEmbedTheme } from "./api";

export const createRecursionTreeComplexityEmbed = (): ContainerEmbedApi => {
  let state: ContainerEmbedState = {
    predictionCommitted: false,
    inputSize: 128,
    branchingFactor: 2,
    shrinkFactor: 2,
    combineExponent: 1,
  };
  let theme: ContainerEmbedTheme = { colorScheme: "light" };

  return {
    async load(target: Element): Promise<void> {
      target.setAttribute("data-paideia-container", "recursion-tree-complexity");
      target.setAttribute("data-paideia-theme", theme.colorScheme);
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
      state = {
        predictionCommitted: false,
        inputSize: 128,
        branchingFactor: 2,
        shrinkFactor: 2,
        combineExponent: 1,
      };
    },
  };
};
