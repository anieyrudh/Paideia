import type { Trace } from "./types.js";

export const replayTrace = <T>(trace: Trace<T>, stepIndex: number): readonly (T | number | string)[] => {
  const values: (T | number | string)[] = [...trace.initial];
  const bounded = Math.min(Math.max(0, Math.floor(stepIndex)), trace.steps.length);

  for (let i = 0; i < bounded; i += 1) {
    const step = trace.steps[i];
    if (step === undefined) continue;
    if (step.kind === "swap") {
      const leftIndex = step.at[0];
      const rightIndex = step.at[1];
      if (leftIndex === undefined || rightIndex === undefined) continue;
      const left = values[leftIndex];
      values[leftIndex] = values[rightIndex] as T | number | string;
      values[rightIndex] = left as T | number | string;
    }
    if (step.kind === "set") {
      const index = step.at[0];
      if (index !== undefined && step.value !== undefined) values[index] = step.value;
    }
  }

  return values;
};
