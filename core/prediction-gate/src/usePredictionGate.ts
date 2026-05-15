import { useCallback, useEffect, useState } from "react";
import type { KernelResult } from "@paideia/shared";
import type { PredictionCommit, PredictionScope } from "./storage.js";
import {
  hasStoredPrediction,
  removeStoredPrediction,
  writeStoredPrediction,
} from "./storage.js";

export interface PredictionGateState {
  readonly revealed: boolean;
  readonly commit: (prediction: PredictionCommit) => KernelResult<void>;
  readonly clear: () => void;
}

export const usePredictionGate = (
  packageId: string,
  simId: PredictionScope,
): PredictionGateState => {
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    setRevealed(hasStoredPrediction(packageId, simId));
  }, [packageId, simId]);

  const commit = useCallback(
    (prediction: PredictionCommit): KernelResult<void> => {
      const result = writeStoredPrediction(packageId, simId, prediction);
      if (result.ok) setRevealed(true);
      return result;
    },
    [packageId, simId],
  );

  const clear = useCallback(() => {
    removeStoredPrediction(packageId, simId);
    setRevealed(false);
  }, [packageId, simId]);

  return { revealed, commit, clear };
};
