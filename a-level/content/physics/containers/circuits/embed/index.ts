export type {
  CircuitsEmbedApi,
  CircuitsEmbedScore,
  CircuitsEmbedState,
  CircuitsEmbedTheme,
} from "./api.js";

import type {
  CircuitsEmbedApi,
  CircuitsEmbedScore,
  CircuitsEmbedState,
  CircuitsEmbedTheme,
} from "./api.js";
import { z } from "zod";

const brand =
  <T extends number>() =>
  (value: number): T =>
    value as T;

const ohms = brand<CircuitsEmbedState["branchAResistanceOhms"]>();
const volts = brand<CircuitsEmbedState["supplyVoltageVolts"]>();

const defaultState: CircuitsEmbedState = {
  branchAResistanceOhms: 40,
  branchBResistanceOhms: 60,
  predictionCommitted: false,
  seriesResistanceOhms: 20,
  supplyVoltageVolts: 9,
};

const CircuitsEmbedStateSchema: z.ZodType<CircuitsEmbedState> = z
  .object({
    branchAResistanceOhms: z.number().finite().positive(),
    branchBResistanceOhms: z.number().finite().positive(),
    predictionCommitted: z.boolean(),
    seriesResistanceOhms: z.number().finite().positive(),
    supplyVoltageVolts: z.number().finite().positive(),
  })
  .strict()
  .transform((state): CircuitsEmbedState => ({
    branchAResistanceOhms: ohms(state.branchAResistanceOhms),
    branchBResistanceOhms: ohms(state.branchBResistanceOhms),
    predictionCommitted: state.predictionCommitted,
    seriesResistanceOhms: ohms(state.seriesResistanceOhms),
    supplyVoltageVolts: volts(state.supplyVoltageVolts),
  }));

const CircuitsEmbedThemeSchema: z.ZodType<CircuitsEmbedTheme> = z
  .object({
    colorScheme: z.enum(["light", "dark"]),
    accentColor: z.string().optional(),
  })
  .strict();

const CircuitsEmbedScoreSchema: z.ZodType<CircuitsEmbedScore> = z
  .object({
    completed: z.boolean(),
    predictionCommitted: z.boolean(),
    score: z.number().min(0).max(1),
  })
  .strict();

const cloneState = (state: CircuitsEmbedState): CircuitsEmbedState => ({
  branchAResistanceOhms: state.branchAResistanceOhms,
  branchBResistanceOhms: state.branchBResistanceOhms,
  predictionCommitted: state.predictionCommitted,
  seriesResistanceOhms: state.seriesResistanceOhms,
  supplyVoltageVolts: state.supplyVoltageVolts,
});

export const createContainerEmbed = (): CircuitsEmbedApi => {
  let state = cloneState(defaultState);
  let targetElement: Element | null = null;

  return {
    async load(target: Element): Promise<void> {
      targetElement?.removeAttribute("data-paideia-theme");
      targetElement = target;
    },
    saveState(): CircuitsEmbedState {
      return CircuitsEmbedStateSchema.parse(cloneState(state));
    },
    score(): CircuitsEmbedScore {
      return CircuitsEmbedScoreSchema.parse({
        completed: state.predictionCommitted,
        predictionCommitted: state.predictionCommitted,
        score: state.predictionCommitted ? 1 : 0,
      });
    },
    resume(nextState: CircuitsEmbedState): void {
      state = cloneState(CircuitsEmbedStateSchema.parse(nextState));
    },
    syncTheme(nextTheme: CircuitsEmbedTheme): void {
      const theme = CircuitsEmbedThemeSchema.parse(nextTheme);
      targetElement?.setAttribute("data-paideia-theme", theme.colorScheme);
    },
    destroy(): void {
      targetElement?.removeAttribute("data-paideia-theme");
      targetElement = null;
      state = cloneState(defaultState);
    },
  };
};
