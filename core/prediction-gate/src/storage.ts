import { z } from "zod";
import { err, ok, type KernelResult } from "@paideia/shared";

export type PredictionScope = string | "package";

export interface PredictionCommit {
  readonly value: unknown;
  readonly rationale?: string;
}

export interface PredictionEvent {
  readonly value: unknown;
  readonly rationale: string;
  readonly committed_at: string;
  readonly spec_version: "1.0.0";
}

export interface StorageLike {
  readonly getItem: (key: string) => string | null;
  readonly setItem: (key: string, value: string) => void;
  readonly removeItem: (key: string) => void;
}

export const StoredPredictionSchema: z.ZodType<PredictionEvent> = z.object({
  value: z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(z.unknown()),
    z.record(z.unknown()),
  ]),
  rationale: z.string(),
  committed_at: z.string().datetime(),
  spec_version: z.literal("1.0.0"),
});

export const predictionStorageKey = (
  packageId: string,
  simId: PredictionScope,
): string => `paideia.predict.${packageId}.${simId}`;

const currentStorage = (): StorageLike | null => {
  if (typeof globalThis === "undefined") return null;
  if (!("localStorage" in globalThis)) return null;
  const candidate = globalThis.localStorage;
  return candidate ?? null;
};

export const readStoredPrediction = (
  packageId: string,
  simId: PredictionScope,
  storage: StorageLike | null = currentStorage(),
): PredictionEvent | null => {
  if (storage === null) return null;
  const raw = storage.getItem(predictionStorageKey(packageId, simId));
  if (raw === null) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  const result = StoredPredictionSchema.safeParse(parsed);
  return result.success ? result.data : null;
};

export const writeStoredPrediction = (
  packageId: string,
  simId: PredictionScope,
  prediction: PredictionCommit,
  storage: StorageLike | null = currentStorage(),
): KernelResult<void> => {
  if (storage === null) {
    return err("precondition-violated", "localStorage is not available");
  }

  const event: PredictionEvent = {
    value: prediction.value,
    rationale: prediction.rationale?.trim() ?? "",
    committed_at: new Date().toISOString(),
    spec_version: "1.0.0",
  };

  const validated = StoredPredictionSchema.safeParse(event);
  if (!validated.success) {
    return err("precondition-violated", "Prediction event failed storage validation");
  }

  storage.setItem(
    predictionStorageKey(packageId, simId),
    JSON.stringify(validated.data),
  );
  return ok(undefined);
};

export const removeStoredPrediction = (
  packageId: string,
  simId: PredictionScope,
  storage: StorageLike | null = currentStorage(),
): void => {
  if (storage === null) return;
  storage.removeItem(predictionStorageKey(packageId, simId));
};

export const hasStoredPrediction = (
  packageId: string,
  simId: PredictionScope,
  storage: StorageLike | null = currentStorage(),
): boolean => readStoredPrediction(packageId, simId, storage) !== null;
