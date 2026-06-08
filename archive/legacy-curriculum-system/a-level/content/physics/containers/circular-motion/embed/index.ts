import { z } from "zod";
import type {
  CircularMotionEmbedApi,
  CircularMotionEmbedScore,
  CircularMotionEmbedState,
  CircularMotionEmbedTheme,
} from "./api.js";

const brand =
  <T extends number>() =>
  (value: number): T =>
    value as T;

const kilograms = brand<CircularMotionEmbedState["massKilograms"]>();
const metres = brand<CircularMotionEmbedState["radiusMetres"]>();
const metresPerSecond = brand<CircularMotionEmbedState["speedMetresPerSecond"]>();

const defaultState: CircularMotionEmbedState = {
  massKilograms: kilograms(1.2),
  speedMetresPerSecond: metresPerSecond(6),
  radiusMetres: metres(4),
  angleDegrees: 45,
  predictionCommitted: false,
};

const CircularMotionEmbedStateSchema: z.ZodType<CircularMotionEmbedState> = z
  .object({
    massKilograms: z.number().finite().positive(),
    speedMetresPerSecond: z.number().finite().positive(),
    radiusMetres: z.number().finite().positive(),
    angleDegrees: z.number().finite().min(0).max(360),
    predictionCommitted: z.boolean(),
  })
  .strict()
  .transform((state): CircularMotionEmbedState => ({
    massKilograms: kilograms(state.massKilograms),
    speedMetresPerSecond: metresPerSecond(state.speedMetresPerSecond),
    radiusMetres: metres(state.radiusMetres),
    angleDegrees: state.angleDegrees,
    predictionCommitted: state.predictionCommitted,
  }));

const CircularMotionEmbedThemeSchema: z.ZodType<CircularMotionEmbedTheme> = z
  .object({
    colorScheme: z.enum(["light", "dark"]),
    accentColor: z.string().optional(),
  })
  .strict();

const CircularMotionEmbedScoreSchema: z.ZodType<CircularMotionEmbedScore> = z
  .object({
    completed: z.boolean(),
    predictionCommitted: z.boolean(),
    score: z.number().min(0).max(1),
  })
  .strict();

const copyState = (state: CircularMotionEmbedState): CircularMotionEmbedState => ({ ...state });

export const createCircularMotionEmbed = (): CircularMotionEmbedApi => {
  let state = copyState(defaultState);
  let targetElement: Element | null = null;

  return {
    async load(target: Element): Promise<void> {
      targetElement = target;
      targetElement.setAttribute("data-paideia-container", "circular-motion");
    },
    saveState(): CircularMotionEmbedState {
      return CircularMotionEmbedStateSchema.parse(copyState(state));
    },
    score(): CircularMotionEmbedScore {
      return CircularMotionEmbedScoreSchema.parse({
        completed: state.predictionCommitted,
        predictionCommitted: state.predictionCommitted,
        score: state.predictionCommitted ? 1 : 0,
      });
    },
    resume(nextState: CircularMotionEmbedState): void {
      state = copyState(CircularMotionEmbedStateSchema.parse(nextState));
    },
    syncTheme(nextTheme: CircularMotionEmbedTheme): void {
      const theme = CircularMotionEmbedThemeSchema.parse(nextTheme);
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
  CircularMotionEmbedApi,
  CircularMotionEmbedScore,
  CircularMotionEmbedState,
  CircularMotionEmbedTheme,
} from "./api.js";
