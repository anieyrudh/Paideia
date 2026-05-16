import { err, ok, type KernelResult } from "@paideia/shared";
import type { SortAlgorithm, Trace, TraceStep } from "./types.js";

interface TraceState {
  readonly steps: TraceStep[];
  comparisons: number;
  swaps: number;
}

const compare = (state: TraceState, at: readonly number[], note?: string): void => {
  state.comparisons += 1;
  state.steps.push({ kind: "compare", at, ...(note !== undefined && { note }) });
};

const swap = (values: number[], state: TraceState, i: number, j: number): void => {
  const left = values[i];
  const right = values[j];
  if (left === undefined || right === undefined) return;
  values[i] = right;
  values[j] = left;
  state.swaps += 1;
  state.steps.push({ kind: "swap", at: [i, j] });
};

const setValue = (
  values: number[],
  state: TraceState,
  index: number,
  value: number,
  note?: string,
): void => {
  values[index] = value;
  state.steps.push({ kind: "set", at: [index], value, ...(note !== undefined && { note }) });
};

const bubble = (values: number[], state: TraceState): void => {
  for (let end = values.length - 1; end > 0; end -= 1) {
    for (let i = 0; i < end; i += 1) {
      compare(state, [i, i + 1]);
      if ((values[i] ?? 0) > (values[i + 1] ?? 0)) swap(values, state, i, i + 1);
    }
  }
};

const insertion = (values: number[], state: TraceState): void => {
  for (let i = 1; i < values.length; i += 1) {
    const key = values[i] ?? 0;
    let j = i - 1;
    while (j >= 0) {
      compare(state, [j, i]);
      if ((values[j] ?? 0) <= key) break;
      setValue(values, state, j + 1, values[j] ?? 0, "shift");
      j -= 1;
    }
    setValue(values, state, j + 1, key, "insert");
  }
};

const selection = (values: number[], state: TraceState): void => {
  for (let i = 0; i < values.length; i += 1) {
    let min = i;
    for (let j = i + 1; j < values.length; j += 1) {
      compare(state, [min, j]);
      if ((values[j] ?? 0) < (values[min] ?? 0)) min = j;
    }
    if (min !== i) swap(values, state, i, min);
  }
};

const mergeRange = (
  values: number[],
  state: TraceState,
  start: number,
  end: number,
): void => {
  if (end - start <= 1) return;
  const mid = Math.floor((start + end) / 2);
  mergeRange(values, state, start, mid);
  mergeRange(values, state, mid, end);

  const left = values.slice(start, mid);
  const right = values.slice(mid, end);
  let i = 0;
  let j = 0;
  let k = start;
  while (i < left.length && j < right.length) {
    compare(state, [start + i, mid + j]);
    const leftValue = left[i] ?? 0;
    const rightValue = right[j] ?? 0;
    if (leftValue <= rightValue) {
      setValue(values, state, k, leftValue, "merge-left");
      i += 1;
    } else {
      setValue(values, state, k, rightValue, "merge-right");
      j += 1;
    }
    k += 1;
  }
  while (i < left.length) {
    setValue(values, state, k, left[i] ?? 0, "merge-left");
    i += 1;
    k += 1;
  }
  while (j < right.length) {
    setValue(values, state, k, right[j] ?? 0, "merge-right");
    j += 1;
    k += 1;
  }
};

const partition = (
  values: number[],
  state: TraceState,
  low: number,
  high: number,
): number => {
  const pivot = values[high] ?? 0;
  state.steps.push({ kind: "mark", at: [high], value: pivot, note: "pivot" });
  let i = low;
  for (let j = low; j < high; j += 1) {
    compare(state, [j, high]);
    if ((values[j] ?? 0) <= pivot) {
      if (i !== j) swap(values, state, i, j);
      i += 1;
    }
  }
  if (i !== high) swap(values, state, i, high);
  return i;
};

const quickRange = (
  values: number[],
  state: TraceState,
  low: number,
  high: number,
): void => {
  if (low >= high) return;
  const pivot = partition(values, state, low, high);
  quickRange(values, state, low, pivot - 1);
  quickRange(values, state, pivot + 1, high);
};

const heapify = (
  values: number[],
  state: TraceState,
  size: number,
  root: number,
): void => {
  let largest = root;
  const left = 2 * root + 1;
  const right = 2 * root + 2;

  if (left < size) {
    compare(state, [left, largest]);
    if ((values[left] ?? 0) > (values[largest] ?? 0)) largest = left;
  }

  if (right < size) {
    compare(state, [right, largest]);
    if ((values[right] ?? 0) > (values[largest] ?? 0)) largest = right;
  }

  if (largest !== root) {
    swap(values, state, root, largest);
    heapify(values, state, size, largest);
  }
};

const heap = (values: number[], state: TraceState): void => {
  for (let i = Math.floor(values.length / 2) - 1; i >= 0; i -= 1) {
    heapify(values, state, values.length, i);
  }
  for (let end = values.length - 1; end > 0; end -= 1) {
    swap(values, state, 0, end);
    heapify(values, state, end, 0);
  }
};

export const traceSort = (
  arr: readonly number[],
  alg: SortAlgorithm,
): KernelResult<Trace<number>> => {
  if (!["bubble", "insertion", "selection", "merge", "quick", "heap"].includes(alg)) {
    return err("precondition-violated", `Unsupported sort algorithm: ${String(alg)}`);
  }
  for (const value of arr) {
    if (!Number.isFinite(value)) {
      return err("precondition-violated", `Sort values must be finite, got ${value}`);
    }
  }

  const initial = [...arr];
  const values = [...arr];
  const state: TraceState = { steps: [], comparisons: 0, swaps: 0 };

  switch (alg) {
    case "bubble":
      bubble(values, state);
      break;
    case "insertion":
      insertion(values, state);
      break;
    case "selection":
      selection(values, state);
      break;
    case "merge":
      mergeRange(values, state, 0, values.length);
      break;
    case "quick":
      quickRange(values, state, 0, values.length - 1);
      break;
    case "heap":
      heap(values, state);
      break;
  }

  return ok({
    initial,
    steps: state.steps,
    final: values,
    meta: {
      algorithm: alg,
      n: arr.length,
      comparisons: state.comparisons,
      swaps: state.swaps,
    },
  });
};
