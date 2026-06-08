import type {
  OscillationsEmbedApi,
  OscillationsEmbedScore,
  OscillationsEmbedState,
  OscillationsEmbedTheme,
} from "./api.js";
import { z } from "zod";

const brand =
  <T extends number>() =>
  (value: number): T =>
    value as T;

const kilograms = brand<OscillationsEmbedState["massKilograms"]>();
const newtonsPerMetre = brand<OscillationsEmbedState["springConstantNewtonsPerMetre"]>();
const metres = brand<OscillationsEmbedState["amplitudeMetres"]>();
const radians = brand<OscillationsEmbedState["phaseRadians"]>();
const seconds = brand<OscillationsEmbedState["timeSeconds"]>();

const defaultState: OscillationsEmbedState = {
  massKilograms: kilograms(2),
  springConstantNewtonsPerMetre: newtonsPerMetre(32),
  amplitudeMetres: metres(0.8),
  phaseRadians: radians(0),
  timeSeconds: seconds(0),
  predictionCommitted: false,
};

const OscillationsEmbedStateSchema: z.ZodType<OscillationsEmbedState> = z
  .object({
    massKilograms: z.number().finite().positive(),
    springConstantNewtonsPerMetre: z.number().finite().positive(),
    amplitudeMetres: z.number().finite().positive(),
    phaseRadians: z.number().finite().nonnegative(),
    timeSeconds: z.number().finite().nonnegative(),
    predictionCommitted: z.boolean(),
  })
  .strict()
  .transform((state): OscillationsEmbedState => ({
    massKilograms: kilograms(state.massKilograms),
    springConstantNewtonsPerMetre: newtonsPerMetre(state.springConstantNewtonsPerMetre),
    amplitudeMetres: metres(state.amplitudeMetres),
    phaseRadians: radians(state.phaseRadians),
    timeSeconds: seconds(state.timeSeconds),
    predictionCommitted: state.predictionCommitted,
  }));

const OscillationsEmbedThemeSchema: z.ZodType<OscillationsEmbedTheme> = z
  .object({
    colorScheme: z.enum(["light", "dark"]),
    accentColor: z.string().optional(),
  })
  .strict();

const OscillationsEmbedScoreSchema: z.ZodType<OscillationsEmbedScore> = z
  .object({
    completed: z.boolean(),
    predictionCommitted: z.boolean(),
    score: z.number().min(0).max(1),
  })
  .strict();

const copyState = (state: OscillationsEmbedState): OscillationsEmbedState => ({ ...state });

export const createOscillationsEmbed = (): OscillationsEmbedApi => {
  let state = copyState(defaultState);
  let targetElement: Element | null = null;

  return {
    async load(target: Element): Promise<void> {
      targetElement = target;
      targetElement.setAttribute("data-paideia-container", "oscillations");
    },
    saveState(): OscillationsEmbedState {
      return OscillationsEmbedStateSchema.parse(copyState(state));
    },
    score(): OscillationsEmbedScore {
      return OscillationsEmbedScoreSchema.parse({
        completed: state.predictionCommitted,
        predictionCommitted: state.predictionCommitted,
        score: state.predictionCommitted ? 1 : 0,
      });
    },
    resume(nextState: OscillationsEmbedState): void {
      state = copyState(OscillationsEmbedStateSchema.parse(nextState));
    },
    syncTheme(nextTheme: OscillationsEmbedTheme): void {
      const theme = OscillationsEmbedThemeSchema.parse(nextTheme);
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
  OscillationsEmbedApi,
  OscillationsEmbedScore,
  OscillationsEmbedState,
  OscillationsEmbedTheme,
} from "./api.js";
