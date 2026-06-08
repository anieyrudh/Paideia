import type {
  ThermalPhysicsEmbedApi,
  ThermalPhysicsEmbedScore,
  ThermalPhysicsEmbedState,
  ThermalPhysicsEmbedTheme,
} from "./api.js";
import { z } from "zod";

const brand =
  <T extends number>() =>
  (value: number): T =>
    value as T;

const litres = brand<ThermalPhysicsEmbedState["volumeLitres"]>();
const celsius = brand<ThermalPhysicsEmbedState["gasTemperatureCelsius"]>();
const moles = brand<ThermalPhysicsEmbedState["amountMoles"]>();
const kilograms = brand<ThermalPhysicsEmbedState["heatingMassKilograms"]>();
const joulesPerKilogramKelvin =
  brand<ThermalPhysicsEmbedState["specificHeatCapacityJoulesPerKilogramKelvin"]>();

const defaultState: ThermalPhysicsEmbedState = {
  volumeLitres: litres(1),
  gasTemperatureCelsius: celsius(27),
  amountMoles: moles(0.04),
  heatingMassKilograms: kilograms(0.25),
  initialTemperatureCelsius: celsius(20),
  finalTemperatureCelsius: celsius(60),
  specificHeatCapacityJoulesPerKilogramKelvin: joulesPerKilogramKelvin(4180),
  predictionCommitted: false,
};

const ThermalPhysicsEmbedStateSchema: z.ZodType<ThermalPhysicsEmbedState> = z
  .object({
    volumeLitres: z.number().finite().positive(),
    gasTemperatureCelsius: z.number().finite(),
    amountMoles: z.number().finite().positive(),
    heatingMassKilograms: z.number().finite().positive(),
    initialTemperatureCelsius: z.number().finite(),
    finalTemperatureCelsius: z.number().finite(),
    specificHeatCapacityJoulesPerKilogramKelvin: z.number().finite().positive(),
    predictionCommitted: z.boolean(),
  })
  .strict()
  .transform((state): ThermalPhysicsEmbedState => ({
    volumeLitres: litres(state.volumeLitres),
    gasTemperatureCelsius: celsius(state.gasTemperatureCelsius),
    amountMoles: moles(state.amountMoles),
    heatingMassKilograms: kilograms(state.heatingMassKilograms),
    initialTemperatureCelsius: celsius(state.initialTemperatureCelsius),
    finalTemperatureCelsius: celsius(state.finalTemperatureCelsius),
    specificHeatCapacityJoulesPerKilogramKelvin: joulesPerKilogramKelvin(
      state.specificHeatCapacityJoulesPerKilogramKelvin,
    ),
    predictionCommitted: state.predictionCommitted,
  }));

const ThermalPhysicsEmbedThemeSchema: z.ZodType<ThermalPhysicsEmbedTheme> = z
  .object({
    colorScheme: z.enum(["light", "dark"]),
    accentColor: z.string().optional(),
  })
  .strict();

const ThermalPhysicsEmbedScoreSchema: z.ZodType<ThermalPhysicsEmbedScore> = z
  .object({
    completed: z.boolean(),
    predictionCommitted: z.boolean(),
    score: z.number().min(0).max(1),
  })
  .strict();

const copyState = (state: ThermalPhysicsEmbedState): ThermalPhysicsEmbedState => ({ ...state });

export const createThermalPhysicsEmbed = (): ThermalPhysicsEmbedApi => {
  let state = copyState(defaultState);
  let targetElement: Element | null = null;

  return {
    async load(target: Element): Promise<void> {
      targetElement = target;
      targetElement.setAttribute("data-paideia-container", "thermal-physics");
    },
    saveState(): ThermalPhysicsEmbedState {
      return ThermalPhysicsEmbedStateSchema.parse(copyState(state));
    },
    score(): ThermalPhysicsEmbedScore {
      return ThermalPhysicsEmbedScoreSchema.parse({
        completed: state.predictionCommitted,
        predictionCommitted: state.predictionCommitted,
        score: state.predictionCommitted ? 1 : 0,
      });
    },
    resume(nextState: ThermalPhysicsEmbedState): void {
      state = copyState(ThermalPhysicsEmbedStateSchema.parse(nextState));
    },
    syncTheme(nextTheme: ThermalPhysicsEmbedTheme): void {
      const theme = ThermalPhysicsEmbedThemeSchema.parse(nextTheme);
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
  ThermalPhysicsEmbedApi,
  ThermalPhysicsEmbedScore,
  ThermalPhysicsEmbedState,
  ThermalPhysicsEmbedTheme,
} from "./api.js";
