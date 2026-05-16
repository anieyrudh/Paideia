import { err, ok, type KernelResult } from "@paideia/shared";
import type { SearchAlgorithm, Trace, TraceStep } from "./types.js";

const isSortedAscending = (arr: readonly number[]): boolean =>
  arr.every((value, index) => index === 0 || value >= (arr[index - 1] ?? value));

export const traceSearch = (
  arr: readonly number[],
  target: number,
  alg: SearchAlgorithm,
): KernelResult<Trace<number>> => {
  if (!Number.isFinite(target)) {
    return err("precondition-violated", "Search target must be finite");
  }

  const initial = [...arr];
  const steps: TraceStep[] = [];
  let comparisons = 0;

  if (alg === "linear") {
    for (let i = 0; i < arr.length; i += 1) {
      comparisons += 1;
      steps.push({ kind: "compare", at: [i], value: target });
      if (arr[i] === target) {
        steps.push({ kind: "mark", at: [i], value: target, note: "found" });
        break;
      }
    }
  } else {
    if (!isSortedAscending(arr)) {
      return err("precondition-violated", "Binary search requires sorted ascending input");
    }

    let low = 0;
    let high = arr.length - 1;
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      comparisons += 1;
      steps.push({ kind: "compare", at: [mid], value: target });
      const value = arr[mid];
      if (value === target) {
        steps.push({ kind: "mark", at: [mid], value: target, note: "found" });
        break;
      }
      if ((value ?? Number.POSITIVE_INFINITY) < target) {
        low = mid + 1;
        steps.push({ kind: "annotate", at: [mid], note: "search right" });
      } else {
        high = mid - 1;
        steps.push({ kind: "annotate", at: [mid], note: "search left" });
      }
    }
  }

  return ok({
    initial,
    steps,
    final: initial,
    meta: {
      algorithm: alg,
      n: arr.length,
      comparisons,
      swaps: 0,
    },
  });
};
