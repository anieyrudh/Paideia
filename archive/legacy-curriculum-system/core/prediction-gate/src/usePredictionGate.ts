import { useCallback, useEffect, useState } from "react";
import type { KernelResult } from "@paideia/shared";
import type { PredictionCommit, PredictionEvent, PredictionScope } from "./storage.js";
import {
  readStoredPrediction,
  removeStoredPrediction,
  writeStoredPrediction,
} from "./storage.js";

export interface PredictionGateState {
  readonly revealed: boolean;
  readonly committed: boolean;
  readonly prediction: PredictionEvent | null;
  readonly commit: (prediction: PredictionCommit) => KernelResult<void>;
  readonly clear: () => void;
}

export const usePredictionGate = (
  packageId: string,
  simId: PredictionScope,
): PredictionGateState => {
  const [prediction, setPrediction] = useState<PredictionEvent | null>(null);

  useEffect(() => {
    setPrediction(readStoredPrediction(packageId, simId));
  }, [packageId, simId]);

  const commit = useCallback(
    (prediction: PredictionCommit): KernelResult<void> => {
      const result = writeStoredPrediction(packageId, simId, prediction);
      if (result.ok) setPrediction(readStoredPrediction(packageId, simId));
      return result;
    },
    [packageId, simId],
  );

  const clear = useCallback(() => {
    removeStoredPrediction(packageId, simId);
    setPrediction(null);
  }, [packageId, simId]);

  const committed = prediction !== null;
  return { revealed: committed, committed, prediction, commit, clear };
};

export const usePredictionCheckpoint = usePredictionGate;
