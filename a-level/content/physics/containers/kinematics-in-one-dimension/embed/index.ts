import type {
  KinematicsEmbedApi,
  KinematicsEmbedScore,
  KinematicsEmbedState,
  KinematicsEmbedTheme,
} from "./api.js";
import { z } from "zod";

const metresPerSecond = (
  value: number,
): KinematicsEmbedState["initialVelocityMetresPerSecond"] =>
  value as KinematicsEmbedState["initialVelocityMetresPerSecond"];

const metresPerSecondSquared = (
  value: number,
): KinematicsEmbedState["accelerationMetresPerSecondSquared"] =>
  value as KinematicsEmbedState["accelerationMetresPerSecondSquared"];

const seconds = (value: number): KinematicsEmbedState["elapsedSeconds"] =>
  value as KinematicsEmbedState["elapsedSeconds"];

const defaultState: KinematicsEmbedState = {
  initialVelocityMetresPerSecond: metresPerSecond(0),
  accelerationMetresPerSecondSquared: metresPerSecondSquared(2),
  elapsedSeconds: seconds(3),
  predictionCommitted: false,
};

const KinematicsEmbedStateSchema: z.ZodType<KinematicsEmbedState> = z
  .object({
    initialVelocityMetresPerSecond: z.number().finite(),
    accelerationMetresPerSecondSquared: z.number().finite(),
    elapsedSeconds: z.number().finite().nonnegative(),
    predictionCommitted: z.boolean(),
  })
  .strict()
  .transform((state): KinematicsEmbedState => ({
    initialVelocityMetresPerSecond: metresPerSecond(state.initialVelocityMetresPerSecond),
    accelerationMetresPerSecondSquared: metresPerSecondSquared(
      state.accelerationMetresPerSecondSquared,
    ),
    elapsedSeconds: seconds(state.elapsedSeconds),
    predictionCommitted: state.predictionCommitted,
  }));

const KinematicsEmbedThemeSchema: z.ZodType<KinematicsEmbedTheme> = z
  .object({
    colorScheme: z.enum(["light", "dark"]),
    accentColor: z.string().optional(),
  })
  .strict();

const KinematicsEmbedScoreSchema: z.ZodType<KinematicsEmbedScore> = z
  .object({
    completed: z.boolean(),
    predictionCommitted: z.boolean(),
    score: z.number().min(0).max(1),
  })
  .strict();

const copyState = (state: KinematicsEmbedState): KinematicsEmbedState => ({ ...state });

export const createKinematicsEmbed = (): KinematicsEmbedApi => {
  let state = copyState(defaultState);
  let targetElement: Element | null = null;

  return {
    async load(target: Element): Promise<void> {
      targetElement = target;
      targetElement.setAttribute("data-paideia-container", "kinematics-in-one-dimension");
    },
    saveState(): KinematicsEmbedState {
      return KinematicsEmbedStateSchema.parse(copyState(state));
    },
    score(): KinematicsEmbedScore {
      return KinematicsEmbedScoreSchema.parse({
        completed: state.predictionCommitted,
        predictionCommitted: state.predictionCommitted,
        score: state.predictionCommitted ? 1 : 0,
      });
    },
    resume(nextState: KinematicsEmbedState): void {
      state = copyState(KinematicsEmbedStateSchema.parse(nextState));
    },
    syncTheme(nextTheme: KinematicsEmbedTheme): void {
      const theme = KinematicsEmbedThemeSchema.parse(nextTheme);
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
  KinematicsEmbedApi,
  KinematicsEmbedScore,
  KinematicsEmbedState,
  KinematicsEmbedTheme,
} from "./api.js";
