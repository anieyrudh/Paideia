import fc from "fast-check";
import { describe, expect, it } from "vitest";
import type { KernelResult } from "@paideia/shared";

import {
  classifyAnomalies,
  dataItem,
  extractConflicts,
  isConflictSerializable,
  precedenceGraph,
  recoverability,
  schedule,
  scheduleOperation,
  transactionId,
  type Schedule,
  type ScheduleOperation,
} from "./index.js";

const unwrap = <T>(result: KernelResult<T>): T => {
  expect(result.ok).toBe(true);
  if (!result.ok) {
    throw new Error("expected ok result");
  }
  return result.value;
};

const op = (tx: string, kind: ScheduleOperation["kind"], item?: string): ScheduleOperation =>
  unwrap(scheduleOperation({ tx, kind, ...(item !== undefined && { item }) }));

const sch = (...operations: ScheduleOperation[]): Schedule => unwrap(schedule(operations));

describe("validation", () => {
  it("constructs identifiers and operations", () => {
    expect(unwrap(transactionId("T1"))).toBe("T1");
    expect(unwrap(dataItem("A"))).toBe("A");
    expect(transactionId(" T1").ok).toBe(false);
    expect(dataItem("").ok).toBe(false);
    expect(scheduleOperation({ tx: "T1", kind: "read" }).ok).toBe(false);
    expect(scheduleOperation({ tx: "T1", kind: "commit", item: "A" }).ok).toBe(false);
  });

  it("rejects operations after a transaction finishes and oversized schedules", () => {
    expect(schedule([op("T1", "commit"), op("T1", "read", "A")]).ok).toBe(false);
    expect(schedule(Array.from({ length: 201 }, () => op("T1", "read", "A"))).ok).toBe(false);
  });

  it("does not mutate caller-owned schedules", () => {
    const operations = [op("T1", "read", "A"), op("T2", "write", "A")];
    const before = JSON.stringify(operations);
    unwrap(extractConflicts(operations));
    expect(JSON.stringify(operations)).toBe(before);
  });
});

describe("conflicts and serializability", () => {
  it("extracts ordered write conflicts and builds the precedence graph", () => {
    const scheduleInput = sch(
      op("T1", "read", "A"),
      op("T2", "write", "A"),
      op("T1", "write", "B"),
      op("T2", "read", "B"),
    );
    const conflicts = unwrap(extractConflicts(scheduleInput));
    expect(conflicts).toHaveLength(2);
    expect(conflicts.map((conflict) => `${conflict.from}->${conflict.to}:${conflict.item}`)).toEqual([
      "T1->T2:A",
      "T1->T2:B",
    ]);
    const graph = unwrap(precedenceGraph(scheduleInput));
    expect(graph.nodes).toEqual(["T1", "T2"]);
    expect(graph.edges).toHaveLength(2);
  });

  it("detects conflict-serializable and cyclic schedules", () => {
    expect(
      unwrap(
        isConflictSerializable(
          sch(op("T1", "write", "A"), op("T2", "read", "A"), op("T2", "write", "B")),
        ),
      ),
    ).toBe(true);
    expect(
      unwrap(
        isConflictSerializable(
          sch(op("T1", "read", "A"), op("T2", "write", "A"), op("T2", "read", "B"), op("T1", "write", "B")),
        ),
      ),
    ).toBe(false);
  });

  it("conflict count is monotone when appending unrelated commits", () => {
    fc.assert(
      fc.property(fc.array(fc.constantFrom("A", "B", "C"), { minLength: 1, maxLength: 20 }), (items) => {
        const operations = items.map((item, index) => op(index % 2 === 0 ? "T1" : "T2", index % 3 === 0 ? "write" : "read", item));
        const base = unwrap(extractConflicts(sch(...operations))).length;
        const extended = unwrap(extractConflicts(sch(...operations, op("T3", "commit")))).length;
        expect(extended).toBe(base);
      }),
    );
  });
});

describe("anomalies and recoverability", () => {
  it("classifies dirty reads and recoverability violations", () => {
    const scheduleInput = sch(
      op("T1", "write", "A"),
      op("T2", "read", "A"),
      op("T2", "commit"),
      op("T1", "commit"),
    );
    const anomalies = unwrap(classifyAnomalies(scheduleInput));
    expect(anomalies.some((anomaly) => anomaly.kind === "dirty-read")).toBe(true);
    const report = unwrap(recoverability(scheduleInput));
    expect(report.recoverable).toBe(false);
    expect(report.cascadingAbortRisk).toBe(true);
  });

  it("classifies dirty writes, non-repeatable reads, and lost updates", () => {
    const scheduleInput = sch(
      op("T1", "read", "A"),
      op("T2", "write", "A"),
      op("T2", "commit"),
      op("T1", "read", "A"),
      op("T3", "write", "B"),
      op("T4", "write", "B"),
      op("T5", "read", "C"),
      op("T6", "read", "C"),
      op("T6", "write", "C"),
      op("T6", "commit"),
      op("T5", "write", "C"),
    );
    const kinds = unwrap(classifyAnomalies(scheduleInput)).map((anomaly) => anomaly.kind);
    expect(kinds).toContain("non-repeatable-read");
    expect(kinds).toContain("dirty-write");
    expect(kinds).toContain("lost-update");
  });

  it("does not overclaim anomalies when intervening writes are uncommitted or unread", () => {
    const scheduleInput = sch(
      op("T1", "read", "A"),
      op("T2", "write", "A"),
      op("T1", "read", "A"),
      op("T3", "read", "B"),
      op("T4", "write", "B"),
      op("T3", "write", "B"),
    );
    const kinds = unwrap(classifyAnomalies(scheduleInput)).map((anomaly) => anomaly.kind);
    expect(kinds).not.toContain("non-repeatable-read");
    expect(kinds).not.toContain("lost-update");
  });

  it("marks committed writer-before-reader schedules recoverable", () => {
    const scheduleInput = sch(
      op("T1", "write", "A"),
      op("T1", "commit"),
      op("T2", "read", "A"),
      op("T2", "commit"),
    );
    const report = unwrap(recoverability(scheduleInput));
    expect(report.recoverable).toBe(true);
    expect(report.cascadingAbortRisk).toBe(false);
    expect(report.violations).toEqual([]);
  });

  it("does not mark an aborted reader unrecoverable after a dirty read", () => {
    const scheduleInput = sch(
      op("T1", "write", "A"),
      op("T2", "read", "A"),
      op("T2", "abort"),
      op("T1", "abort"),
    );
    const report = unwrap(recoverability(scheduleInput));
    expect(report.recoverable).toBe(true);
    expect(report.cascadingAbortRisk).toBe(true);
    expect(report.violations).toEqual([]);
  });
});
