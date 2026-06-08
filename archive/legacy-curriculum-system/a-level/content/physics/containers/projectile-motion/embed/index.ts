import { z } from "zod";
import type {
  ProjectileMotionEmbedApi,
  ProjectileMotionEmbedScore,
  ProjectileMotionEmbedState,
  ProjectileMotionEmbedTheme,
} from "./api.js";

const defaultState: ProjectileMotionEmbedState = {
  launchSpeedMetresPerSecond: 18,
  launchAngleDegrees: 35,
  launchHeightMetres: 2,
  predictionCommitted: false,
};

const ProjectileMotionEmbedStateSchema: z.ZodType<ProjectileMotionEmbedState> = z
  .object({
    launchSpeedMetresPerSecond: z.number().finite().min(4).max(30),
    launchAngleDegrees: z.number().finite().min(0).max(70),
    launchHeightMetres: z.number().finite().min(0).max(20),
    predictionCommitted: z.boolean(),
  })
  .strict();

const ProjectileMotionEmbedThemeSchema: z.ZodType<ProjectileMotionEmbedTheme> = z
  .object({
    colorScheme: z.enum(["light", "dark"]),
    accentColor: z.string().optional(),
  })
  .strict();

const ProjectileMotionEmbedScoreSchema: z.ZodType<ProjectileMotionEmbedScore> = z
  .object({
    completed: z.boolean(),
    predictionCommitted: z.boolean(),
    score: z.number().min(0).max(1),
  })
  .strict();

const copyState = (state: ProjectileMotionEmbedState): ProjectileMotionEmbedState => ({ ...state });

export const createProjectileMotionEmbed = (): ProjectileMotionEmbedApi => {
  let state = copyState(defaultState);
  let targetElement: Element | null = null;

  return {
    async load(target: Element): Promise<void> {
      targetElement = target;
      targetElement.setAttribute("data-paideia-container", "projectile-motion");
    },
    saveState(): ProjectileMotionEmbedState {
      return ProjectileMotionEmbedStateSchema.parse(copyState(state));
    },
    score(): ProjectileMotionEmbedScore {
      return ProjectileMotionEmbedScoreSchema.parse({
        completed: state.predictionCommitted,
        predictionCommitted: state.predictionCommitted,
        score: state.predictionCommitted ? 1 : 0,
      });
    },
    resume(nextState: ProjectileMotionEmbedState): void {
      state = copyState(ProjectileMotionEmbedStateSchema.parse(nextState));
    },
    syncTheme(nextTheme: ProjectileMotionEmbedTheme): void {
      const theme = ProjectileMotionEmbedThemeSchema.parse(nextTheme);
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
  ProjectileMotionEmbedApi,
  ProjectileMotionEmbedScore,
  ProjectileMotionEmbedState,
  ProjectileMotionEmbedTheme,
} from "./api.js";
