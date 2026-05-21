import { err, ok, type KernelResult } from "@paideia/shared";
import type { TraceStep } from "./types.js";

export interface LinearRecurrenceRow {
  readonly index: number;
  readonly value: number;
  readonly dependencies: readonly number[];
  readonly status: "base" | "derived";
}

export interface LinearRecurrenceTraceEntry {
  readonly state: number;
  readonly value: number;
  readonly kind: "base" | "derive" | "reuse";
}

export interface LinearRecurrenceTrace {
  readonly target: number;
  readonly rows: readonly LinearRecurrenceRow[];
  readonly entries: readonly LinearRecurrenceTraceEntry[];
  readonly steps: readonly TraceStep[];
  readonly plainCallCount: number;
  readonly memoizedEvaluations: number;
  readonly memoHits: number;
}

const validateTarget = (target: number): KernelResult<number> =>
  Number.isInteger(target) && target >= 0 && target <= 64
    ? ok(target)
    : err("precondition-violated", "target must be an integer in [0, 64]");

const validateBaseValues = (baseValues: readonly number[]): KernelResult<readonly number[]> => {
  if (baseValues.length === 0) {
    return err("precondition-violated", "at least one base value is required");
  }
  for (const value of baseValues) {
    if (!Number.isFinite(value)) {
      return err("precondition-violated", "base values must be finite");
    }
  }
  return ok(baseValues);
};

const validateOffsets = (offsets: readonly number[]): KernelResult<readonly number[]> => {
  if (offsets.length === 0) {
    return err("precondition-violated", "at least one dependency offset is required");
  }
  for (const offset of offsets) {
    if (!Number.isInteger(offset) || offset <= 0) {
      return err("precondition-violated", "dependency offsets must be positive integers");
    }
  }
  return ok(offsets);
};

const dependencyStates = (state: number, offsets: readonly number[]): readonly number[] =>
  offsets.map((offset) => state - offset).filter((candidate) => candidate >= 0);

const plainCallCount = (
  state: number,
  baseCount: number,
  offsets: readonly number[],
): number => {
  if (state < baseCount) return 1;
  return (
    1 +
    dependencyStates(state, offsets)
      .map((dependency) => plainCallCount(dependency, baseCount, offsets))
      .reduce((sum, calls) => sum + calls, 0)
  );
};

export const traceLinearRecurrence = (
  target: number,
  baseValues: readonly number[],
  dependencyOffsets: readonly number[],
): KernelResult<LinearRecurrenceTrace> => {
  const validTarget = validateTarget(target);
  if (!validTarget.ok) return validTarget;
  const validBase = validateBaseValues(baseValues);
  if (!validBase.ok) return validBase;
  const validOffsets = validateOffsets(dependencyOffsets);
  if (!validOffsets.ok) return validOffsets;

  const rows: LinearRecurrenceRow[] = [];
  for (let index = 0; index <= target; index += 1) {
    if (index < baseValues.length) {
      rows.push({
        index,
        value: baseValues[index] ?? 0,
        dependencies: [],
        status: "base",
      });
      continue;
    }

    const dependencies = dependencyStates(index, dependencyOffsets);
    if (dependencies.length !== dependencyOffsets.length) {
      return err("precondition-violated", "dependency offsets must resolve to existing states");
    }
    const value = dependencies
      .map((dependency) => rows[dependency]?.value ?? 0)
      .reduce((sum, entry) => sum + entry, 0);
    rows.push({ index, value, dependencies, status: "derived" });
  }

  const cache = new Map<number, number>();
  const entries: LinearRecurrenceTraceEntry[] = [];
  const steps: TraceStep[] = [];
  let memoHits = 0;

  const visit = (state: number): number => {
    const cached = cache.get(state);
    if (cached !== undefined) {
      memoHits += 1;
      entries.push({ state, value: cached, kind: "reuse" });
      steps.push({
        kind: "annotate",
        at: [state],
        value: cached,
        note: `state ${state} reused from table`,
      });
      return cached;
    }

    steps.push({ kind: "visit", at: [state], note: `visit state ${state}` });
    const row = rows[state];
    if (row === undefined) return 0;
    if (row.status === "base") {
      cache.set(state, row.value);
      entries.push({ state, value: row.value, kind: "base" });
      steps.push({ kind: "set", at: [state], value: row.value, note: "base case" });
      return row.value;
    }

    const value = row.dependencies
      .map((dependency) => visit(dependency))
      .reduce((sum, entry) => sum + entry, 0);
    cache.set(state, value);
    entries.push({ state, value, kind: "derive" });
    steps.push({ kind: "set", at: [state], value, note: `state ${state} derived` });
    return value;
  };

  visit(target);

  return ok({
    target,
    rows,
    entries,
    steps,
    plainCallCount: plainCallCount(target, baseValues.length, dependencyOffsets),
    memoizedEvaluations: rows.length,
    memoHits,
  });
};
