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

const kilograms = brand<WorkEnergyPowerEmbedState["massAKilograms"]>();
const metresPerSecond = brand<WorkEnergyPowerEmbedState["velocityAMetresPerSecond"]>();

const defaultState: WorkEnergyPowerEmbedState = {
  massAKilograms: kilograms(0.5),
  massBKilograms: kilograms(1),
  velocityAMetresPerSecond: metresPerSecond(2),
  velocityBMetresPerSecond: metresPerSecond(-0.5),
  predictionCommitted: false,
};

const MomentumEmbedStateSchema: z.ZodType<WorkEnergyPowerEmbedState> = z
  .object({
    massAKilograms: z.number().finite().positive(),
    massBKilograms: z.number().finite().positive(),
    velocityAMetresPerSecond: z.number().finite(),
    velocityBMetresPerSecond: z.number().finite(),
    predictionCommitted: z.boolean(),
  })
  .strict()
  .transform((state): WorkEnergyPowerEmbedState => ({
    massAKilograms: kilograms(state.massAKilograms),
    massBKilograms: kilograms(state.massBKilograms),
    velocityAMetresPerSecond: metresPerSecond(state.velocityAMetresPerSecond),
    velocityBMetresPerSecond: metresPerSecond(state.velocityBMetresPerSecond),
    predictionCommitted: state.predictionCommitted,
  }));

const MomentumEmbedThemeSchema: z.ZodType<WorkEnergyPowerEmbedTheme> = z
  .object({
    colorScheme: z.enum(["light", "dark"]),
    accentColor: z.string().optional(),
  })
  .strict();

const MomentumEmbedScoreSchema: z.ZodType<WorkEnergyPowerEmbedScore> = z
  .object({
    completed: z.boolean(),
    predictionCommitted: z.boolean(),
    score: z.number().min(0).max(1),
  })
  .strict();

const copyState = (state: WorkEnergyPowerEmbedState): WorkEnergyPowerEmbedState => ({ ...state });

export const createMomentumEmbed = (): WorkEnergyPowerEmbedApi => {
  let state = copyState(defaultState);
  let targetElement: Element | null = null;

  return {
    async load(target: Element): Promise<void> {
      targetElement = target;
      targetElement.setAttribute("data-paideia-container", "momentum");
    },
    saveState(): WorkEnergyPowerEmbedState {
      return MomentumEmbedStateSchema.parse(copyState(state));
    },
    score(): WorkEnergyPowerEmbedScore {
      return MomentumEmbedScoreSchema.parse({
        completed: state.predictionCommitted,
        predictionCommitted: state.predictionCommitted,
        score: state.predictionCommitted ? 1 : 0,
      });
    },
    resume(nextState: WorkEnergyPowerEmbedState): void {
      state = copyState(MomentumEmbedStateSchema.parse(nextState));
    },
    syncTheme(nextTheme: WorkEnergyPowerEmbedTheme): void {
      const theme = MomentumEmbedThemeSchema.parse(nextTheme);
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
