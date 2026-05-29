import type { KernelResult } from "@paideia/shared";
import type { PredictionCommit, PredictionScope } from "./storage.js";
import {
  hasStoredPrediction,
  removeStoredPrediction,
  writeStoredPrediction,
} from "./storage.js";

export { PredictionGate } from "./component.js";
export { usePredictionCheckpoint, usePredictionGate } from "./usePredictionGate.js";
export type { PredictionCommit, PredictionEvent, PredictionScope } from "./storage.js";

export const commitPrediction = (
  packageId: string,
  simId: PredictionScope,
  prediction: PredictionCommit,
): KernelResult<void> => writeStoredPrediction(packageId, simId, prediction);

export const isPredictionCommitted = (
  packageId: string,
  simId: PredictionScope,
): boolean => hasStoredPrediction(packageId, simId);

/**
 * @deprecated Use isPredictionCommitted. Prediction no longer controls
 * whether the simulation is visible; it only records learner reflection.
 */
export const isRevealed = isPredictionCommitted;

export const clearPrediction = (
  packageId: string,
  simId: PredictionScope,
): void => {
  removeStoredPrediction(packageId, simId);
};
