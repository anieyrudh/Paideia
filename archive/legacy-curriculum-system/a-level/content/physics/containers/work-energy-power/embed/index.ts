import type {
  WorkEnergyPowerEmbedApi,
  WorkEnergyPowerEmbedScore,
  WorkEnergyPowerEmbedState,
  WorkEnergyPowerEmbedTheme,
} from "./api.js";
import { z } from "zod";

const brand =
  <T extends number>() =>
  (value: number): T =>
    value as T;

const newtons = brand<WorkEnergyPowerEmbedState["forceNewtons"]>();
const metres = brand<WorkEnergyPowerEmbedState["displacementMetres"]>();
const degrees = brand<WorkEnergyPowerEmbedState["angleDegrees"]>();
const seconds = brand<WorkEnergyPowerEmbedState["elapsedSeconds"]>();
const kilograms = brand<WorkEnergyPowerEmbedState["massKilograms"]>();
const metresPerSecond = brand<WorkEnergyPowerEmbedState["initialSpeedMetresPerSecond"]>();

const defaultState: WorkEnergyPowerEmbedState = {
  forceNewtons: newtons(10),
  displacementMetres: metres(3),
  angleDegrees: degrees(0),
  elapsedSeconds: seconds(2),
  massKilograms: kilograms(4),
  initialSpeedMetresPerSecond: metresPerSecond(1),
  predictionCommitted: false,
};

const WorkEnergyPowerEmbedStateSchema: z.ZodType<WorkEnergyPowerEmbedState> = z
  .object({
    forceNewtons: z.number().finite(),
    displacementMetres: z.number().finite(),
    angleDegrees: z.number().finite(),
    elapsedSeconds: z.number().finite().positive(),
    massKilograms: z.number().finite().positive(),
    initialSpeedMetresPerSecond: z.number().finite().nonnegative(),
    predictionCommitted: z.boolean(),
  })
  .strict()
  .transform((state): WorkEnergyPowerEmbedState => ({
    forceNewtons: newtons(state.forceNewtons),
    displacementMetres: metres(state.displacementMetres),
    angleDegrees: degrees(state.angleDegrees),
    elapsedSeconds: seconds(state.elapsedSeconds),
    massKilograms: kilograms(state.massKilograms),
    initialSpeedMetresPerSecond: metresPerSecond(state.initialSpeedMetresPerSecond),
    predictionCommitted: state.predictionCommitted,
  }));

const WorkEnergyPowerEmbedThemeSchema: z.ZodType<WorkEnergyPowerEmbedTheme> = z
  .object({
    colorScheme: z.enum(["light", "dark"]),
    accentColor: z.string().optional(),
  })
  .strict();

const WorkEnergyPowerEmbedScoreSchema: z.ZodType<WorkEnergyPowerEmbedScore> = z
  .object({
    completed: z.boolean(),
    predictionCommitted: z.boolean(),
    score: z.number().min(0).max(1),
  })
  .strict();

const copyState = (state: WorkEnergyPowerEmbedState): WorkEnergyPowerEmbedState => ({ ...state });

export const createWorkEnergyPowerEmbed = (): WorkEnergyPowerEmbedApi => {
  let state = copyState(defaultState);
  let targetElement: Element | null = null;

  return {
    async load(target: Element): Promise<void> {
      targetElement = target;
      targetElement.setAttribute("data-paideia-container", "work-energy-power");
    },
    saveState(): WorkEnergyPowerEmbedState {
      return WorkEnergyPowerEmbedStateSchema.parse(copyState(state));
    },
    score(): WorkEnergyPowerEmbedScore {
      return WorkEnergyPowerEmbedScoreSchema.parse({
        completed: state.predictionCommitted,
        predictionCommitted: state.predictionCommitted,
        score: state.predictionCommitted ? 1 : 0,
      });
    },
    resume(nextState: WorkEnergyPowerEmbedState): void {
      state = copyState(WorkEnergyPowerEmbedStateSchema.parse(nextState));
    },
    syncTheme(nextTheme: WorkEnergyPowerEmbedTheme): void {
      const theme = WorkEnergyPowerEmbedThemeSchema.parse(nextTheme);
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
  WorkEnergyPowerEmbedApi,
  WorkEnergyPowerEmbedScore,
  WorkEnergyPowerEmbedState,
  WorkEnergyPowerEmbedTheme,
} from "./api.js";
