import type {
  GravitationalFieldsEmbedApi,
  GravitationalFieldsEmbedScore,
  GravitationalFieldsEmbedState,
  GravitationalFieldsEmbedTheme,
} from "./api.js";
import { clearPrediction, commitPrediction, isRevealed } from "@paideia/prediction-gate";
import { z } from "zod";

const brand =
  <T extends number>() =>
  (value: number): T =>
    value as T;

const kilograms = brand<GravitationalFieldsEmbedState["testMassKilograms"]>();

const defaultState: GravitationalFieldsEmbedState = {
  sourceMassEarthMasses: 1,
  radiusEarthRadii: 1,
  testMassKilograms: kilograms(1000),
  comparisonRadiusEarthRadii: 2,
  predictionCommitted: false,
};

const GravitationalFieldsEmbedStateSchema: z.ZodType<GravitationalFieldsEmbedState> = z
  .object({
    sourceMassEarthMasses: z.number().finite().positive(),
    radiusEarthRadii: z.number().finite().positive(),
    testMassKilograms: z.number().finite().positive(),
    comparisonRadiusEarthRadii: z.number().finite().positive(),
    predictionCommitted: z.boolean(),
  })
  .strict()
  .transform((state): GravitationalFieldsEmbedState => ({
    sourceMassEarthMasses: state.sourceMassEarthMasses,
    radiusEarthRadii: state.radiusEarthRadii,
    testMassKilograms: kilograms(state.testMassKilograms),
    comparisonRadiusEarthRadii: state.comparisonRadiusEarthRadii,
    predictionCommitted: state.predictionCommitted,
  }));

const GravitationalFieldsEmbedThemeSchema: z.ZodType<GravitationalFieldsEmbedTheme> = z
  .object({
    colorScheme: z.enum(["light", "dark"]),
    accentColor: z.string().optional(),
  })
  .strict();

const GravitationalFieldsEmbedScoreSchema: z.ZodType<GravitationalFieldsEmbedScore> = z
  .object({
    completed: z.boolean(),
    predictionCommitted: z.boolean(),
    score: z.number().min(0).max(1),
  })
  .strict();

const ElementSchema = z.custom<Element>(
  (value) => typeof Element !== "undefined" && value instanceof Element,
  "Expected a DOM Element",
);
const packageId = "gravitational-fields";
const simId = "inverse-square-field-lab";

const copyState = (state: GravitationalFieldsEmbedState): GravitationalFieldsEmbedState => ({ ...state });

export const createGravitationalFieldsEmbed = (): GravitationalFieldsEmbedApi => {
  let state = copyState(defaultState);
  let targetElement: Element | null = null;

  return {
    async load(target: Element): Promise<void> {
      targetElement = ElementSchema.parse(target);
      targetElement.setAttribute("data-paideia-container", "gravitational-fields");
    },
    saveState(): GravitationalFieldsEmbedState {
      return GravitationalFieldsEmbedStateSchema.parse(copyState(state));
    },
    score(): GravitationalFieldsEmbedScore {
      const predictionCommitted = isRevealed(packageId, simId) || state.predictionCommitted;
      return GravitationalFieldsEmbedScoreSchema.parse({
        completed: predictionCommitted,
        predictionCommitted,
        score: predictionCommitted ? 1 : 0,
      });
    },
    resume(nextState: GravitationalFieldsEmbedState): void {
      state = copyState(GravitationalFieldsEmbedStateSchema.parse(nextState));
      if (state.predictionCommitted) {
        commitPrediction(packageId, simId, {
          value: "embed-resume",
          rationale: "Prediction was already committed in the embedding host.",
        });
      }
    },
    syncTheme(nextTheme: GravitationalFieldsEmbedTheme): void {
      const theme = GravitationalFieldsEmbedThemeSchema.parse(nextTheme);
      targetElement?.setAttribute("data-paideia-theme", theme.colorScheme);
    },
    destroy(): void {
      targetElement?.removeAttribute("data-paideia-container");
      targetElement?.removeAttribute("data-paideia-theme");
      targetElement = null;
      clearPrediction(packageId, simId);
      state = copyState(defaultState);
    },
  };
};

export type {
  GravitationalFieldsEmbedApi,
  GravitationalFieldsEmbedScore,
  GravitationalFieldsEmbedState,
  GravitationalFieldsEmbedTheme,
} from "./api.js";
