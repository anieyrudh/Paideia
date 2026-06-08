import type {
  WavesEmbedApi,
  WavesEmbedScore,
  WavesEmbedState,
  WavesEmbedTheme,
} from "./api.js";
import { z } from "zod";

const brand =
  <T extends number>() =>
  (value: number): T =>
    value as T;

const metres = brand<WavesEmbedState["amplitudeMetres"]>();
const seconds = brand<WavesEmbedState["periodSeconds"]>();
const degrees = brand<WavesEmbedState["phaseDegrees"]>();

const defaultState: WavesEmbedState = {
  amplitudeMetres: metres(1.5),
  wavelengthMetres: metres(4),
  periodSeconds: seconds(2),
  phaseDegrees: degrees(0),
  samplePositionMetres: metres(1),
  timeSeconds: seconds(0),
  predictionCommitted: false,
};

const WavesEmbedStateSchema: z.ZodType<WavesEmbedState> = z
  .object({
    amplitudeMetres: z.number().finite().positive(),
    wavelengthMetres: z.number().finite().positive(),
    periodSeconds: z.number().finite().positive(),
    phaseDegrees: z.number().finite(),
    samplePositionMetres: z.number().finite(),
    timeSeconds: z.number().finite().nonnegative(),
    predictionCommitted: z.boolean(),
  })
  .strict()
  .transform((state): WavesEmbedState => ({
    amplitudeMetres: metres(state.amplitudeMetres),
    wavelengthMetres: metres(state.wavelengthMetres),
    periodSeconds: seconds(state.periodSeconds),
    phaseDegrees: degrees(state.phaseDegrees),
    samplePositionMetres: metres(state.samplePositionMetres),
    timeSeconds: seconds(state.timeSeconds),
    predictionCommitted: state.predictionCommitted,
  }));

const WavesEmbedThemeSchema: z.ZodType<WavesEmbedTheme> = z
  .object({
    colorScheme: z.enum(["light", "dark"]),
    accentColor: z.string().optional(),
  })
  .strict();

const WavesEmbedScoreSchema: z.ZodType<WavesEmbedScore> = z
  .object({
    completed: z.boolean(),
    predictionCommitted: z.boolean(),
    score: z.number().min(0).max(1),
  })
  .strict();

const copyState = (state: WavesEmbedState): WavesEmbedState => ({ ...state });

export const createWavesEmbed = (): WavesEmbedApi => {
  let state = copyState(defaultState);
  let targetElement: Element | null = null;

  return {
    async load(target: Element): Promise<void> {
      targetElement = target;
      targetElement.setAttribute("data-paideia-container", "waves");
    },
    saveState(): WavesEmbedState {
      return WavesEmbedStateSchema.parse(copyState(state));
    },
    score(): WavesEmbedScore {
      return WavesEmbedScoreSchema.parse({
        completed: state.predictionCommitted,
        predictionCommitted: state.predictionCommitted,
        score: state.predictionCommitted ? 1 : 0,
      });
    },
    resume(nextState: WavesEmbedState): void {
      state = copyState(WavesEmbedStateSchema.parse(nextState));
    },
    syncTheme(nextTheme: WavesEmbedTheme): void {
      const theme = WavesEmbedThemeSchema.parse(nextTheme);
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
  WavesEmbedApi,
  WavesEmbedScore,
  WavesEmbedState,
  WavesEmbedTheme,
} from "./api.js";
