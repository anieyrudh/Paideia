import fc from "fast-check";
import { describe, expect, it } from "vitest";
import type { KernelResult } from "@paideia/shared";

import {
  arrivalRate,
  customerCount,
  duration,
  durationSquared,
  littleLawArrivalRate,
  littleLawAverageNumber,
  littleLawAverageTime,
  mg1Metrics,
  mm1Metrics,
  mmcMetrics,
  serverCount,
  serverUtilization,
  serviceRate,
  utilization,
  type DurationSquared,
} from "./index.js";

const unwrap = <T>(result: KernelResult<T>): T => {
  expect(result.ok).toBe(true);
  if (!result.ok) {
    throw new Error("expected ok result");
  }
  return result.value;
};

describe("unit constructors", () => {
  it("constructs valid queueing units and rejects impossible values", () => {
    expect(unwrap(arrivalRate(0))).toBe(0);
    expect(unwrap(serviceRate(3))).toBe(3);
    expect(unwrap(duration(0))).toBe(0);
    expect(unwrap(durationSquared(0))).toBe(0);
    expect(unwrap(customerCount(4.2))).toBe(4.2);
    expect(unwrap(serverCount(2))).toBe(2);
    expect(unwrap(utilization(1.3))).toBe(1.3);
    expect(serviceRate(0).ok).toBe(false);
    expect(duration(Number.NaN).ok).toBe(false);
    expect(serverCount(1.5).ok).toBe(false);
  });
});

describe("Little's Law", () => {
  it("computes L, W, and lambda from the other two terms", () => {
    expect(
      unwrap(
        littleLawAverageNumber({
          arrivalRate: unwrap(arrivalRate(6)),
          averageTimeInSystem: unwrap(duration(0.5)),
        }),
      ),
    ).toBeCloseTo(3);
    expect(
      unwrap(
        littleLawAverageTime({
          arrivalRate: unwrap(arrivalRate(6)),
          averageNumberInSystem: unwrap(customerCount(3)),
        }),
      ),
    ).toBeCloseTo(0.5);
    expect(
      unwrap(
        littleLawArrivalRate({
          averageNumberInSystem: unwrap(customerCount(3)),
          averageTimeInSystem: unwrap(duration(0.5)),
        }),
      ),
    ).toBeCloseTo(6);
  });

  it("rejects zero divisors", () => {
    expect(
      littleLawAverageTime({
        arrivalRate: unwrap(arrivalRate(0)),
        averageNumberInSystem: unwrap(customerCount(3)),
      }).ok,
    ).toBe(false);
    expect(
      littleLawArrivalRate({
        averageNumberInSystem: unwrap(customerCount(3)),
        averageTimeInSystem: unwrap(duration(0)),
      }).ok,
    ).toBe(false);
  });

  it("preserves L = lambda W for positive finite inputs", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 1e-6, max: 1e4, noNaN: true }),
        fc.double({ min: 1e-6, max: 1e4, noNaN: true }),
        (lambdaValue, waitValue) => {
          const averageNumber = unwrap(
            littleLawAverageNumber({
              arrivalRate: unwrap(arrivalRate(lambdaValue)),
              averageTimeInSystem: unwrap(duration(waitValue)),
            }),
          );
          expect(averageNumber).toBeCloseTo(lambdaValue * waitValue);
        },
      ),
    );
  });
});

describe("server utilization", () => {
  it("computes utilization for one or many servers", () => {
    expect(
      unwrap(
        serverUtilization({
          arrivalRate: unwrap(arrivalRate(8)),
          serviceRate: unwrap(serviceRate(10)),
        }),
      ),
    ).toBeCloseTo(0.8);
    expect(
      unwrap(
        serverUtilization({
          arrivalRate: unwrap(arrivalRate(16)),
          serviceRate: unwrap(serviceRate(10)),
          servers: unwrap(serverCount(2)),
        }),
      ),
    ).toBeCloseTo(0.8);
  });
});

describe("M/M/1", () => {
  it("computes canonical stable M/M/1 metrics", () => {
    const metrics = unwrap(
      mm1Metrics({
        arrivalRate: unwrap(arrivalRate(8)),
        serviceRate: unwrap(serviceRate(10)),
      }),
    );
    expect(metrics.utilization).toBeCloseTo(0.8);
    expect(metrics.averageNumberInSystem).toBeCloseTo(4);
    expect(metrics.averageNumberInQueue).toBeCloseTo(3.2);
    expect(metrics.averageTimeInSystem).toBeCloseTo(0.5);
    expect(metrics.averageTimeInQueue).toBeCloseTo(0.4);
  });

  it("rejects unstable M/M/1 queues", () => {
    expect(
      mm1Metrics({
        arrivalRate: unwrap(arrivalRate(10)),
        serviceRate: unwrap(serviceRate(10)),
      }).ok,
    ).toBe(false);
  });
});

describe("M/M/c", () => {
  it("computes Erlang C metrics for stable multi-server queues", () => {
    const metrics = unwrap(
      mmcMetrics({
        arrivalRate: unwrap(arrivalRate(16)),
        serviceRate: unwrap(serviceRate(10)),
        servers: unwrap(serverCount(2)),
      }),
    );
    expect(metrics.servers).toBe(2);
    expect(metrics.utilization).toBeCloseTo(0.8);
    expect(metrics.probabilitySystemEmpty).toBeCloseTo(1 / 9);
    expect(metrics.erlangC).toBeCloseTo(0.711111, 5);
    expect(metrics.averageNumberInQueue).toBeCloseTo(2.844444, 5);
    expect(metrics.averageTimeInQueue).toBeCloseTo(0.177778, 5);
  });

  it("rejects unstable or invalid M/M/c inputs", () => {
    expect(
      mmcMetrics({
        arrivalRate: unwrap(arrivalRate(20)),
        serviceRate: unwrap(serviceRate(10)),
        servers: unwrap(serverCount(2)),
      }).ok,
    ).toBe(false);
  });

  it("handles zero-arrival M/M/c as an empty stable system", () => {
    const metrics = unwrap(
      mmcMetrics({
        arrivalRate: unwrap(arrivalRate(0)),
        serviceRate: unwrap(serviceRate(10)),
        servers: unwrap(serverCount(3)),
      }),
    );
    expect(metrics.probabilitySystemEmpty).toBe(1);
    expect(metrics.erlangC).toBe(0);
    expect(metrics.averageNumberInSystem).toBe(0);
    expect(metrics.averageTimeInSystem).toBeCloseTo(0.1);
  });

  it("handles high-server stable cases without factorial overflow", () => {
    const metrics = unwrap(
      mmcMetrics({
        arrivalRate: unwrap(arrivalRate(168.3)),
        serviceRate: unwrap(serviceRate(1)),
        servers: unwrap(serverCount(170)),
      }),
    );
    expect(metrics.utilization).toBeCloseTo(0.99);
    expect(Number.isFinite(metrics.erlangC)).toBe(true);
    expect(Number.isFinite(metrics.averageTimeInQueue)).toBe(true);
    expect(metrics.averageNumberInQueue).toBeGreaterThan(0);
  });
});

describe("M/G/1", () => {
  it("computes Pollaczek-Khinchine M/G/1 metrics", () => {
    const metrics = unwrap(
      mg1Metrics({
        arrivalRate: unwrap(arrivalRate(4)),
        meanServiceTime: unwrap(duration(0.2)),
        serviceTimeVariance: unwrap(durationSquared(0.01)),
      }),
    );
    expect(metrics.utilization).toBeCloseTo(0.8);
    expect(metrics.averageTimeInQueue).toBeCloseTo(0.5);
    expect(metrics.averageTimeInSystem).toBeCloseTo(0.7);
    expect(metrics.averageNumberInQueue).toBeCloseTo(2);
    expect(metrics.averageNumberInSystem).toBeCloseTo(2.8);
  });

  it("rejects unstable or invalid M/G/1 inputs", () => {
    expect(
      mg1Metrics({
        arrivalRate: unwrap(arrivalRate(5)),
        meanServiceTime: unwrap(duration(0.2)),
        serviceTimeVariance: unwrap(durationSquared(0.01)),
      }).ok,
    ).toBe(false);
    expect(
      mg1Metrics({
        arrivalRate: unwrap(arrivalRate(4)),
        meanServiceTime: unwrap(duration(0.2)),
        serviceTimeVariance: -1 as DurationSquared,
      }).ok,
    ).toBe(false);
  });
});
