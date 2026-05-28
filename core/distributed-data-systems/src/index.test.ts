import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { type KernelResult } from "@paideia/shared";
import {
  bytes,
  count,
  fraction,
  hdfsBlockPlan,
  shuffleEstimate,
  sparkPartitionPlan,
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

describe("@paideia/distributed-data-systems HDFS planning", () => {
  it("computes block and replication counts", () => {
    const plan = expectOk(hdfsBlockPlan({
      fileSizeBytes: bytes(300),
      blockSizeBytes: bytes(128),
      replicationFactor: count(3),
    }));
    expect(plan.blockCount).toBe(3);
    expect(plan.finalBlockBytes).toBe(44);
    expect(plan.replicatedBytes).toBe(900);
    expect(Object.isFrozen(plan)).toBe(true);
  });

  it("rejects invalid HDFS inputs", () => {
    expectErrCode(hdfsBlockPlan({
      fileSizeBytes: bytes(-1),
      blockSizeBytes: bytes(128),
      replicationFactor: count(3),
    }), "precondition-violated");
    expectErrCode(hdfsBlockPlan({
      fileSizeBytes: bytes(100),
      blockSizeBytes: bytes(0),
      replicationFactor: count(3),
    }), "precondition-violated");
  });
});

describe("@paideia/distributed-data-systems Spark planning", () => {
  it("computes partition and shuffle estimates", () => {
    const partitions = expectOk(sparkPartitionPlan({
      recordCount: count(1_001),
      targetRecordsPerPartition: count(100),
    }));
    expect(partitions.partitionCount).toBe(11);
    expect(partitions.recordsPerPartitionCeiling).toBe(91);

    const shuffle = expectOk(shuffleEstimate({
      mapOutputBytes: bytes(10_000),
      selectivity: expectOk(fraction(0.25)),
      reducerCount: count(5),
    }));
    expect(shuffle.shuffleBytes).toBe(2_500);
    expect(shuffle.bytesPerReducer).toBe(500);
    expect(Object.isFrozen(shuffle)).toBe(true);
  });

  it("rejects invalid Spark inputs", () => {
    expectErrCode(sparkPartitionPlan({
      recordCount: count(10),
      targetRecordsPerPartition: count(0),
    }), "precondition-violated");
    expectErrCode(fraction(1.5), "out-of-domain");
    expectErrCode(shuffleEstimate({
      mapOutputBytes: bytes(10_000),
      selectivity: 1.5 as never,
      reducerCount: count(5),
    }), "out-of-domain");
  });

  it("keeps HDFS block count monotonic in file size", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1_000_000 }),
        fc.integer({ min: 0, max: 1_000_000 }),
        (a, b) => {
          const small = Math.min(a, b);
          const large = Math.max(a, b);
          const smallPlan = expectOk(hdfsBlockPlan({
            fileSizeBytes: bytes(small),
            blockSizeBytes: bytes(128),
            replicationFactor: count(3),
          }));
          const largePlan = expectOk(hdfsBlockPlan({
            fileSizeBytes: bytes(large),
            blockSizeBytes: bytes(128),
            replicationFactor: count(3),
          }));
          expect(largePlan.blockCount).toBeGreaterThanOrEqual(smallPlan.blockCount);
        },
      ),
    );
  });
});
