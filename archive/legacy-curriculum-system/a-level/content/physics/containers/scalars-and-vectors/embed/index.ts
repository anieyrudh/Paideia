import type {
  ScalarsVectorsEmbedApi,
  ScalarsVectorsEmbedScore,
  ScalarsVectorsEmbedState,
  ScalarsVectorsEmbedTheme,
} from "./api.js";
import { z } from "zod";

const defaultState: ScalarsVectorsEmbedState = {
  vectorA: 5,
  vectorB: 5,
  angleDegrees: 90,
  predictionCommitted: false,
};

const ScalarsVectorsEmbedStateSchema: z.ZodType<ScalarsVectorsEmbedState> = z
  .object({
    vectorA: z.number().finite(),
    vectorB: z.number().finite(),
    angleDegrees: z.number().finite(),
    predictionCommitted: z.boolean(),
  })
  .strict();

const ScalarsVectorsEmbedThemeSchema: z.ZodType<ScalarsVectorsEmbedTheme> = z
  .object({
    colorScheme: z.enum(["light", "dark"]),
    accentColor: z.string().optional(),
  })
  .strict();

const ScalarsVectorsEmbedScoreSchema: z.ZodType<ScalarsVectorsEmbedScore> = z
  .object({
    completed: z.boolean(),
    predictionCommitted: z.boolean(),
    score: z.number().min(0).max(1),
  })
  .strict();

const copyState = (state: ScalarsVectorsEmbedState): ScalarsVectorsEmbedState => ({ ...state });

export const createScalarsVectorsEmbed = (): ScalarsVectorsEmbedApi => {
  let state = copyState(defaultState);
  let targetElement: Element | null = null;
  let theme: ScalarsVectorsEmbedTheme = { colorScheme: "light" };

  return {
    async load(target: Element): Promise<void> {
      targetElement = target;
      targetElement.setAttribute("data-paideia-container", "scalars-and-vectors");
    },
    saveState(): ScalarsVectorsEmbedState {
      return ScalarsVectorsEmbedStateSchema.parse(copyState(state));
    },
    score(): ScalarsVectorsEmbedScore {
      return ScalarsVectorsEmbedScoreSchema.parse({
        completed: state.predictionCommitted,
        predictionCommitted: state.predictionCommitted,
        score: state.predictionCommitted ? 1 : 0,
      });
    },
    resume(nextState: ScalarsVectorsEmbedState): void {
      state = copyState(ScalarsVectorsEmbedStateSchema.parse(nextState));
    },
    syncTheme(nextTheme: ScalarsVectorsEmbedTheme): void {
      theme = ScalarsVectorsEmbedThemeSchema.parse(nextTheme);
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
  ScalarsVectorsEmbedApi,
  ScalarsVectorsEmbedScore,
  ScalarsVectorsEmbedState,
  ScalarsVectorsEmbedTheme,
};
