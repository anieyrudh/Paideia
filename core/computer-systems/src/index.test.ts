import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { type KernelResult } from "@paideia/shared";
import {
  firstComeFirstServedSchedule,
  pageOffset,
} from "./index.js";

const expectOk = <T>(result: KernelResult<T>): T => {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error("Expected KernelResult.ok");
  return result.value;
};

const expectErrCode = (result: KernelResult<unknown>, code: string) => {
  expect(result.ok).toBe(false);
  if (result.ok) throw new Error("Expected KernelResult.err");
  expect(result.error.code).toBe(code);
};

describe("@paideia/computer-systems CPU scheduling and memory helpers", () => {
  it("computes FCFS scheduling metrics", () => {
    const schedule = expectOk(firstComeFirstServedSchedule([
      { id: "P1", arrivalTime: 0, burstTime: 4 },
      { id: "P2", arrivalTime: 1, burstTime: 3 },
      { id: "P3", arrivalTime: 5, burstTime: 2 },
    ]));
    expect(schedule.processes.map((process) => process.id)).toEqual(["P1", "P2", "P3"]);
    expect(schedule.processes[1]?.waitingTime).toBe(3);
    expect(schedule.averageWaitingTime).toBeCloseTo(5 / 3, 12);
    expect(schedule.averageTurnaroundTime).toBeCloseTo(14 / 3, 12);
    expect(Object.isFrozen(schedule.processes)).toBe(true);
  });

  it("computes page number and offset", () => {
    const result = expectOk(pageOffset({ address: 4_500, pageSizeBytes: 1_024 }));
    expect(result.pageNumber).toBe(4);
    expect(result.offsetBytes).toBe(404);
    expect(Object.isFrozen(result)).toBe(true);
  });

  it("rejects invalid inputs", () => {
    expectErrCode(firstComeFirstServedSchedule([]), "precondition-violated");
    expectErrCode(firstComeFirstServedSchedule([
      { id: " ", arrivalTime: 0, burstTime: 1 },
    ]), "precondition-violated");
    expectErrCode(pageOffset({ address: -1, pageSizeBytes: 1_024 }), "precondition-violated");
    expectErrCode(pageOffset({ address: 10.5, pageSizeBytes: 1_024 }), "precondition-violated");
  });

  it("keeps page offsets within the page size", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1_000_000 }),
        fc.integer({ min: 1, max: 65_536 }),
        (address, pageSizeBytes) => {
          const result = expectOk(pageOffset({ address, pageSizeBytes }));
          expect(result.offsetBytes).toBeGreaterThanOrEqual(0);
          expect(result.offsetBytes).toBeLessThan(pageSizeBytes);
        },
      ),
    );
  });
});
