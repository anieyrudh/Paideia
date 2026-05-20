import type {
  PhysicalQuantitiesEmbedApi,
  PhysicalQuantitiesEmbedScore,
  PhysicalQuantitiesEmbedState,
  PhysicalQuantitiesEmbedTheme,
} from "./api.js";
import { z } from "zod";

const defaultState: PhysicalQuantitiesEmbedState = {
  selectedExample: "acceleration-unit-check",
  completed: false,
};

const PhysicalQuantitiesEmbedStateSchema: z.ZodType<PhysicalQuantitiesEmbedState> = z
  .object({
    selectedExample: z.string().min(1),
    completed: z.boolean(),
  })
  .strict();

const PhysicalQuantitiesEmbedThemeSchema: z.ZodType<PhysicalQuantitiesEmbedTheme> = z
  .object({
    colorScheme: z.enum(["light", "dark"]),
  })
  .strict();

const PhysicalQuantitiesEmbedScoreSchema: z.ZodType<PhysicalQuantitiesEmbedScore> = z
  .object({
    completed: z.boolean(),
    score: z.number().min(0).max(1),
  })
  .strict();

const copyState = (state: PhysicalQuantitiesEmbedState): PhysicalQuantitiesEmbedState => ({ ...state });

export const createPhysicalQuantitiesEmbed = (): PhysicalQuantitiesEmbedApi => {
  let state = copyState(defaultState);
  let targetElement: Element | null = null;
  let theme: PhysicalQuantitiesEmbedTheme = { colorScheme: "light" };

  return {
    async load(target: Element): Promise<void> {
      targetElement = target;
      targetElement.setAttribute("data-paideia-container", "physical-quantities-and-units");
    },
    saveState(): PhysicalQuantitiesEmbedState {
      return PhysicalQuantitiesEmbedStateSchema.parse(copyState(state));
    },
    score(): PhysicalQuantitiesEmbedScore {
      return PhysicalQuantitiesEmbedScoreSchema.parse({
        completed: state.completed,
        score: state.completed ? 1 : 0,
      });
    },
    resume(nextState: PhysicalQuantitiesEmbedState): void {
      state = copyState(PhysicalQuantitiesEmbedStateSchema.parse(nextState));
    },
    syncTheme(nextTheme: PhysicalQuantitiesEmbedTheme): void {
      theme = PhysicalQuantitiesEmbedThemeSchema.parse(nextTheme);
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
  PhysicalQuantitiesEmbedApi,
  PhysicalQuantitiesEmbedScore,
  PhysicalQuantitiesEmbedState,
  PhysicalQuantitiesEmbedTheme,
};
