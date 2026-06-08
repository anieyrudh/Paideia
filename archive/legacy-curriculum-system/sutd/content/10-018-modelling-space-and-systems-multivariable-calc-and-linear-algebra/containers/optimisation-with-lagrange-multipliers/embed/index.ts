import type { ContainerEmbedApi, ContainerEmbedState, ContainerEmbedTheme } from "./api.js";

export const createEmbed = (): ContainerEmbedApi => {
  let target: Element | null = null;
  let predictionCommitted = false;

  return {
    async load(nextTarget: Element): Promise<void> {
      target = nextTarget;
      target.setAttribute("data-paideia-container", "optimisation-with-lagrange-multipliers");
    },
    saveState(): ContainerEmbedState {
      return { predictionCommitted };
    },
    score() {
      return { completed: predictionCommitted, predictionCommitted, score: predictionCommitted ? 1 : 0 };
    },
    resume(state: ContainerEmbedState): void {
      predictionCommitted = state.predictionCommitted;
    },
    syncTheme(theme: ContainerEmbedTheme): void {
      target?.setAttribute("data-paideia-theme", theme.colorScheme);
      if (theme.accentColor !== undefined) target?.setAttribute("data-paideia-accent", theme.accentColor);
    },
    destroy(): void {
      target?.removeAttribute("data-paideia-container");
      target?.removeAttribute("data-paideia-theme");
      target?.removeAttribute("data-paideia-accent");
      target = null;
      predictionCommitted = false;
    },
  };
};
