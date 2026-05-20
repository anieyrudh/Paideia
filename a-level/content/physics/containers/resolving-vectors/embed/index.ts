import type {
  ResolvingVectorsEmbedApi,
  ResolvingVectorsEmbedScore,
  ResolvingVectorsEmbedState,
  ResolvingVectorsEmbedTheme,
} from "./api.js";
import { z } from "zod";

const defaultState: ResolvingVectorsEmbedState = {
  magnitudeNewtons: 10,
  angleDegrees: 30,
  predictionCommitted: false,
};

const ResolvingVectorsEmbedStateSchema: z.ZodType<ResolvingVectorsEmbedState> = z
  .object({
    magnitudeNewtons: z.number().finite(),
    angleDegrees: z.number().finite(),
    predictionCommitted: z.boolean(),
  })
  .strict();

const ResolvingVectorsEmbedThemeSchema: z.ZodType<ResolvingVectorsEmbedTheme> = z
  .object({
    colorScheme: z.enum(["light", "dark"]),
    accentColor: z.string().optional(),
  })
  .strict();

const ResolvingVectorsEmbedScoreSchema: z.ZodType<ResolvingVectorsEmbedScore> = z
  .object({
    completed: z.boolean(),
    predictionCommitted: z.boolean(),
    score: z.number().min(0).max(1),
  })
  .strict();

const copyState = (state: ResolvingVectorsEmbedState): ResolvingVectorsEmbedState => ({ ...state });

export const createResolvingVectorsEmbed = (): ResolvingVectorsEmbedApi => {
  let state = copyState(defaultState);
  let targetElement: Element | null = null;
  let theme: ResolvingVectorsEmbedTheme = { colorScheme: "light" };

  return {
    async load(target: Element): Promise<void> {
      targetElement = target;
      targetElement.setAttribute("data-paideia-container", "resolving-vectors");
    },
    saveState(): ResolvingVectorsEmbedState {
      return ResolvingVectorsEmbedStateSchema.parse(copyState(state));
    },
    score(): ResolvingVectorsEmbedScore {
      return ResolvingVectorsEmbedScoreSchema.parse({
        completed: state.predictionCommitted,
        predictionCommitted: state.predictionCommitted,
        score: state.predictionCommitted ? 1 : 0,
      });
    },
    resume(nextState: ResolvingVectorsEmbedState): void {
      state = copyState(ResolvingVectorsEmbedStateSchema.parse(nextState));
    },
    syncTheme(nextTheme: ResolvingVectorsEmbedTheme): void {
      theme = ResolvingVectorsEmbedThemeSchema.parse(nextTheme);
      targetElement?.setAttribute("data-paideia-theme", theme.colorScheme);
    },
    destroy(): void {
      targetElement?.removeAttribute("data-paideia-container");
      targetElement?.removeAttribute("data-paideia-theme");
      targetElement = null;
      state = copyState(defaultState);
    },
  };
};

export type {
  ResolvingVectorsEmbedApi,
  ResolvingVectorsEmbedScore,
  ResolvingVectorsEmbedState,
  ResolvingVectorsEmbedTheme,
};
