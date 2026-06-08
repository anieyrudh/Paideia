export type {
  CapacitanceEmbedApi,
  CapacitanceEmbedScore,
  CapacitanceEmbedState,
  CapacitanceEmbedTheme,
} from "./api.js";

import { z } from "zod";
import type {
  CapacitanceEmbedApi,
  CapacitanceEmbedScore,
  CapacitanceEmbedState,
  CapacitanceEmbedTheme,
} from "./api.js";

const defaultState: CapacitanceEmbedState = {
  capacitanceMicrofarads: 470,
  dischargeResistanceKilohms: 5,
  predictionCommitted: false,
  sampleTimeMilliseconds: 1500,
  supplyVoltageVolts: 6,
};

const CapacitanceEmbedStateSchema: z.ZodType<CapacitanceEmbedState> = z
  .object({
    capacitanceMicrofarads: z.number().finite().min(100).max(1000),
    dischargeResistanceKilohms: z.number().finite().min(1).max(20),
    predictionCommitted: z.boolean(),
    sampleTimeMilliseconds: z.number().finite().min(0).max(5000),
    supplyVoltageVolts: z.number().finite().min(2).max(12),
  })
  .strict();

const CapacitanceEmbedThemeSchema: z.ZodType<CapacitanceEmbedTheme> = z
  .object({
    colorScheme: z.enum(["light", "dark"]),
    accentColor: z.string().optional(),
  })
  .strict();

const CapacitanceEmbedScoreSchema: z.ZodType<CapacitanceEmbedScore> = z
  .object({
    completed: z.boolean(),
    predictionCommitted: z.boolean(),
    score: z.number().min(0).max(1),
  })
  .strict();

const cloneState = (state: CapacitanceEmbedState): CapacitanceEmbedState => ({
  capacitanceMicrofarads: state.capacitanceMicrofarads,
  dischargeResistanceKilohms: state.dischargeResistanceKilohms,
  predictionCommitted: state.predictionCommitted,
  sampleTimeMilliseconds: state.sampleTimeMilliseconds,
  supplyVoltageVolts: state.supplyVoltageVolts,
});

export const createContainerEmbed = (): CapacitanceEmbedApi => {
  let state = cloneState(defaultState);
  let targetElement: Element | null = null;

  return {
    async load(target: Element): Promise<void> {
      targetElement?.removeAttribute("data-paideia-theme");
      targetElement = target;
    },
    saveState(): CapacitanceEmbedState {
      return CapacitanceEmbedStateSchema.parse(cloneState(state));
    },
    score(): CapacitanceEmbedScore {
      return CapacitanceEmbedScoreSchema.parse({
        completed: state.predictionCommitted,
        predictionCommitted: state.predictionCommitted,
        score: state.predictionCommitted ? 1 : 0,
      });
    },
    resume(nextState: CapacitanceEmbedState): void {
      state = cloneState(CapacitanceEmbedStateSchema.parse(nextState));
    },
    syncTheme(nextTheme: CapacitanceEmbedTheme): void {
      const theme = CapacitanceEmbedThemeSchema.parse(nextTheme);
      targetElement?.setAttribute("data-paideia-theme", theme.colorScheme);
    },
    destroy(): void {
      targetElement?.removeAttribute("data-paideia-theme");
      targetElement = null;
      state = cloneState(defaultState);
    },
  };
};
