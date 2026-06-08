import fc from "fast-check";
import { describe, expect, it } from "vitest";
import type { KernelResult } from "@paideia/shared";

import {
  activityId,
  criticalPath,
  duration,
  jobId,
  nonNegativeDuration,
  roundRobinSchedule,
  sequenceJobs,
  singleMachineSchedule,
  time,
  type Activity,
  type Job,
} from "./index.js";

const unwrap = <T>(result: KernelResult<T>): T => {
  expect(result.ok).toBe(true);
  if (!result.ok) {
    throw new Error("expected ok result");
  }
  return result.value;
};

const job = (
  id: string,
  processing: number,
  due?: number,
  arrival = 0,
): Job => ({
  id: unwrap(jobId(id)),
  processingTime: unwrap(duration(processing)),
  arrivalTime: unwrap(time(arrival)),
  ...(due !== undefined && { dueTime: unwrap(time(due)) }),
});

const activity = (
  id: string,
  length: number,
  predecessors: readonly string[] = [],
): Activity => ({
  id: unwrap(activityId(id)),
  duration: unwrap(duration(length)),
  predecessors: predecessors.map((value) => unwrap(activityId(value))),
});

describe("constructors", () => {
  it("constructs valid scheduling brands and rejects invalid values", () => {
    expect(unwrap(time(0))).toBe(0);
    expect(unwrap(duration(1))).toBe(1);
    expect(unwrap(nonNegativeDuration(0))).toBe(0);
    expect(unwrap(jobId("J1"))).toBe("J1");
    expect(unwrap(activityId("A"))).toBe("A");
    expect(duration(0).ok).toBe(false);
    expect(nonNegativeDuration(-1).ok).toBe(false);
    expect(time(-1).ok).toBe(false);
    expect(jobId(" J").ok).toBe(false);
  });
});

describe("sequencing and non-preemptive schedule metrics", () => {
  it("orders jobs by common sequencing rules", () => {
    const jobs = [job("A", 5, 10), job("B", 2, 12), job("C", 3, 7)];
    expect(unwrap(sequenceJobs(jobs, "fcfs")).map((item) => item.id)).toEqual(["A", "B", "C"]);
    expect(unwrap(sequenceJobs(jobs, "spt")).map((item) => item.id)).toEqual(["B", "C", "A"]);
    expect(unwrap(sequenceJobs(jobs, "edd")).map((item) => item.id)).toEqual(["C", "A", "B"]);
  });

  it("preserves input queue order for FCFS arrival ties", () => {
    const jobs = [job("B", 2), job("A", 2), job("C", 2)];
    expect(unwrap(sequenceJobs(jobs, "fcfs")).map((item) => item.id)).toEqual(["B", "A", "C"]);
    expect(unwrap(singleMachineSchedule(jobs, "fcfs")).jobs.map((item) => item.id)).toEqual([
      "B",
      "A",
      "C",
    ]);
  });

  it("computes single-machine schedule KPIs", () => {
    const schedule = unwrap(
      singleMachineSchedule([job("A", 5, 10), job("B", 2, 12), job("C", 3, 7)], "spt"),
    );
    expect(schedule.jobs.map((item) => item.id)).toEqual(["B", "C", "A"]);
    expect(schedule.makespan).toBe(10);
    expect(schedule.averageFlowTime).toBeCloseTo((2 + 5 + 10) / 3);
    expect(schedule.maxLateness).toBe(0);
    expect(schedule.tardyJobCount).toBe(0);
  });

  it("respects arrival gaps", () => {
    const schedule = unwrap(singleMachineSchedule([job("A", 2, 5, 3)], "fcfs"));
    expect(schedule.jobs[0]?.startTime).toBe(3);
    expect(schedule.jobs[0]?.waitingTime).toBe(0);
    expect(schedule.makespan).toBe(5);
  });

  it("dispatches SPT from available jobs rather than waiting for future short jobs", () => {
    const schedule = unwrap(
      singleMachineSchedule([job("long-now", 4, 10, 0), job("short-later", 1, 10, 5)], "spt"),
    );
    expect(schedule.jobs.map((item) => item.id)).toEqual(["long-now", "short-later"]);
    expect(schedule.jobs[0]?.completionTime).toBe(4);
    expect(schedule.jobs[1]?.startTime).toBe(5);
  });

  it("rejects missing due times for EDD and critical ratio", () => {
    expect(singleMachineSchedule([job("A", 2)], "edd").ok).toBe(false);
    expect(sequenceJobs([job("A", 2)], "critical-ratio").ok).toBe(false);
  });

  it("SPT does not increase average flow time against FCFS for all jobs available at time zero", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 1, max: 20 }), { minLength: 1, maxLength: 8 }),
        (durations) => {
          const jobs = durations.map((value, index) => job(`J${index}`, value));
          const fcfs = unwrap(singleMachineSchedule(jobs, "fcfs"));
          const spt = unwrap(singleMachineSchedule(jobs, "spt"));
          expect(spt.averageFlowTime).toBeLessThanOrEqual(fcfs.averageFlowTime + 1e-9);
        },
      ),
    );
  });
});

describe("round-robin scheduling", () => {
  it("computes deterministic round-robin slices and completion metrics", () => {
    const result = unwrap(
      roundRobinSchedule({
        jobs: [job("A", 5), job("B", 3)],
        quantum: unwrap(duration(2)),
      }),
    );
    expect(result.slices.map((slice) => `${slice.id}:${slice.startTime}-${slice.endTime}`)).toEqual([
      "A:0-2",
      "B:2-4",
      "A:4-6",
      "B:6-7",
      "A:7-8",
    ]);
    expect(result.jobs.find((item) => item.id === "A")?.completionTime).toBe(8);
    expect(result.jobs.find((item) => item.id === "B")?.completionTime).toBe(7);
  });
});

describe("critical path", () => {
  it("computes CPM timings and critical activities", () => {
    const result = unwrap(
      criticalPath([
        activity("A", 3),
        activity("B", 2, ["A"]),
        activity("C", 4, ["A"]),
        activity("D", 1, ["B", "C"]),
      ]),
    );
    expect(result.projectDuration).toBe(8);
    expect(result.criticalPath).toEqual(["A", "C", "D"]);
    expect(result.activities.find((item) => item.id === "B")?.slack).toBe(2);
  });

  it("rejects missing predecessors and cycles", () => {
    expect(criticalPath([activity("A", 1, ["B"])]).ok).toBe(false);
    expect(
      criticalPath([
        activity("A", 1, ["B"]),
        activity("B", 1, ["A"]),
      ]).ok,
    ).toBe(false);
  });
});
