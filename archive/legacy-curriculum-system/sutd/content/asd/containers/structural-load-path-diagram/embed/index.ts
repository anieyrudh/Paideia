import type {
  ContainerEmbedApi,
  ContainerEmbedScore,
  ContainerEmbedState,
  ContainerEmbedTheme,
} from "./api.js";

export const createEmbed = (): ContainerEmbedApi => {
  let targetElement: Element | null = null;
  let predictionCommitted = false;
  let destroyed = false;
  let theme: ContainerEmbedTheme = { colorScheme: "light" };

  return {
    async load(target: Element): Promise<void> {
      targetElement = target;
      destroyed = false;
      targetElement.setAttribute("data-paideia-container", "structural-load-path-diagram");
      targetElement.setAttribute("data-color-scheme", theme.colorScheme);
    },
    saveState(): ContainerEmbedState {
      return { predictionCommitted };
    },
    score(): ContainerEmbedScore {
      const completed = !destroyed && predictionCommitted;
      return {
        completed,
        predictionCommitted,
        score: completed ? 1 : 0,
      };
    },
    resume(state: ContainerEmbedState): void {
      predictionCommitted = state.predictionCommitted;
    },
    syncTheme(nextTheme: ContainerEmbedTheme): void {
      theme = nextTheme;
      targetElement?.setAttribute("data-color-scheme", nextTheme.colorScheme);
      if (nextTheme.accentColor !== undefined) {
        targetElement?.setAttribute("data-accent-color", nextTheme.accentColor);
      }
    },
    destroy(): void {
      destroyed = true;
      predictionCommitted = false;
      targetElement?.removeAttribute("data-paideia-container");
      targetElement = null;
    },
  };
};

export type {
  ContainerEmbedApi,
  ContainerEmbedScore,
  ContainerEmbedState,
  ContainerEmbedTheme,
};
