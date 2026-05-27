import fc from "fast-check";
import { describe, expect, it } from "vitest";
import type { KernelResult } from "@paideia/shared";

import {
  btreeHeight,
  comparePlans,
  estimateSelectivity,
  indexLookupCost,
  indexStats,
  insertMaintenanceCost,
  nonNegativeNumber,
  positiveInteger,
  selectivity,
  tableScanCost,
  tableStats,
  type IndexStats,
  type PredicateEstimate,
  type TableStats,
} from "./index.js";

const unwrap = <T>(result: KernelResult<T>): T => {
  expect(result.ok).toBe(true);
  if (!result.ok) {
    throw new Error("expected ok result");
  }
  return result.value;
};

const table = (rows = 1_000, pages = 100, distinctValues = 100): TableStats =>
  unwrap(tableStats({ rows, pages, distinctValues }));

const btree = (clustered: boolean, leafPages = 100, fanout = 10): IndexStats =>
  unwrap(indexStats({ kind: "secondary-btree", leafPages, fanout, clustered }));

describe("validation", () => {
  it("constructs bounded numeric primitives", () => {
    expect(unwrap(positiveInteger(1))).toBe(1);
    expect(unwrap(nonNegativeNumber(0))).toBe(0);
    expect(unwrap(selectivity(0.5))).toBe(0.5);
    expect(positiveInteger(0).ok).toBe(false);
    expect(positiveInteger(1.2).ok).toBe(false);
    expect(nonNegativeNumber(Number.NaN).ok).toBe(false);
    expect(selectivity(1.2).ok).toBe(false);
  });

  it("validates table and index statistics", () => {
    expect(tableStats({ rows: 10, pages: 2, distinctValues: 5 }).ok).toBe(true);
    expect(tableStats({ rows: 10, pages: 2, distinctValues: 11 }).ok).toBe(false);
    expect(indexStats({ kind: "hash", leafPages: 4, fanout: 2, clustered: false }).ok).toBe(true);
    expect(indexStats({ kind: "secondary-btree", leafPages: 4, fanout: 1, clustered: false }).ok).toBe(false);
  });
});

describe("predicate and scan costs", () => {
  it("uses distinct values for equality selectivity and default range selectivity", () => {
    const equality = unwrap(estimateSelectivity(table(), "equality"));
    expect(equality.selectivity).toBe(0.01);
    expect(equality.expectedRows).toBe(10);
    expect(equality.expectedPages).toBe(1);
    expect(equality.assumptions.join(" ")).toContain("1 / distinct values");

    const range = unwrap(estimateSelectivity(table(), "range"));
    expect(range.selectivity).toBe(0.1);
    expect(range.expectedRows).toBe(100);
    expect(range.expectedPages).toBe(10);
    expect(range.assumptions.join(" ")).toContain("default range selectivity");
  });

  it("surfaces caller-supplied and unknown-distinct selectivity assumptions", () => {
    const hinted = unwrap(estimateSelectivity(table(), "range", unwrap(selectivity(0.25))));
    expect(hinted.assumptions.join(" ")).toContain("caller-supplied");

    const noDistinct = unwrap(tableStats({ rows: 1_000, pages: 100 }));
    const fallback = unwrap(estimateSelectivity(noDistinct, "equality"));
    expect(fallback.assumptions.join(" ")).toContain("distinct values are unknown");
  });

  it("estimates table scan as all table pages", () => {
    const scan = unwrap(tableScanCost(table()));
    expect(scan.plan).toBe("table-scan");
    expect(scan.costPages).toBe(100);
    expect(scan.expectedRows).toBe(1_000);
  });

  it("selectivity expected rows are monotone with the hint", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 1, noNaN: true }),
        fc.double({ min: 0, max: 1, noNaN: true }),
        (leftRaw, rightRaw) => {
          const left = Math.min(leftRaw, rightRaw);
          const right = Math.max(leftRaw, rightRaw);
          const leftEstimate = unwrap(estimateSelectivity(table(), "range", unwrap(selectivity(left))));
          const rightEstimate = unwrap(estimateSelectivity(table(), "range", unwrap(selectivity(right))));
          expect(leftEstimate.expectedRows).toBeLessThanOrEqual(rightEstimate.expectedRows);
        },
      ),
    );
  });
});

describe("index cost models", () => {
  it("computes B+tree height from leaf pages and fanout", () => {
    expect(unwrap(btreeHeight(btree(true, 1, 10)))).toBe(1);
    expect(unwrap(btreeHeight(btree(true, 100, 10)))).toBe(3);
    expect(btreeHeight(unwrap(indexStats({ kind: "hash", leafPages: 10, fanout: 4, clustered: false }))).ok).toBe(false);
  });

  it("makes clustered lookup cheaper than unclustered lookup for the same predicate", () => {
    const predicate = unwrap(estimateSelectivity(table(), "equality"));
    const clustered = unwrap(indexLookupCost(table(), btree(true), predicate));
    const unclustered = unwrap(indexLookupCost(table(), btree(false), predicate));
    expect(clustered.plan).toBe("index-equality");
    expect(unclustered.costPages).toBeGreaterThan(clustered.costPages);
  });

  it("supports B+tree range lookup and rejects hash range lookup", () => {
    const predicate = unwrap(estimateSelectivity(table(), "range"));
    const plan = unwrap(indexLookupCost(table(), btree(true), predicate));
    expect(plan.plan).toBe("index-range");
    expect(plan.assumptions.join(" ")).toContain("range scan");

    const hash = unwrap(indexStats({ kind: "hash", leafPages: 20, fanout: 4, clustered: false }));
    expect(indexLookupCost(table(), hash, predicate).ok).toBe(false);
  });

  it("rejects stale predicate estimates that do not match table stats", () => {
    const predicate: PredicateEstimate = {
      ...unwrap(estimateSelectivity(table(), "equality")),
      expectedRows: unwrap(nonNegativeNumber(99)),
    };
    expect(indexLookupCost(table(), btree(true), predicate).ok).toBe(false);
  });
});

describe("plan comparison and maintenance", () => {
  it("chooses the cheapest plan and preserves tie order", () => {
    const scan = unwrap(tableScanCost(table()));
    const predicate = unwrap(estimateSelectivity(table(), "equality"));
    const index = unwrap(indexLookupCost(table(), btree(true), predicate));
    expect(unwrap(comparePlans([scan, index]))).toEqual(index);
    expect(unwrap(comparePlans([scan, { ...scan }]))).toEqual(scan);
    expect(comparePlans([]).ok).toBe(false);
  });

  it("rejects malformed plan assumptions without throwing", () => {
    const scan = unwrap(tableScanCost(table()));
    const malformed = { ...scan, assumptions: undefined } as unknown as typeof scan;
    expect(comparePlans([malformed]).ok).toBe(false);
  });

  it("sums index insert maintenance costs without mutating caller arrays", () => {
    const indexes = [
      btree(true, 100, 10),
      unwrap(indexStats({ kind: "hash", leafPages: 20, fanout: 4, clustered: false })),
    ];
    const before = JSON.stringify(indexes);
    expect(unwrap(insertMaintenanceCost(indexes))).toBe(5);
    expect(JSON.stringify(indexes)).toBe(before);
  });
});
