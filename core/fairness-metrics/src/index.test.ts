import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { type KernelResult } from "@paideia/shared";
import {
  confusionCountsByGroup,
  demographicParityGap,
  equalOpportunityGap,
  equalizedOddsMaxGap,
  groupAuditReport,
  groupName,
  probabilityScore,
  rateMetricsByGroup,
  thresholdSweepSummary,
  type BinaryGroupExample,
  type GroupConfusionCounts,
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

const a = expectOk(groupName("A"));
const b = expectOk(groupName("B"));

const examples: readonly BinaryGroupExample[] = [
  { id: "a1", group: a, actualPositive: true, predictedPositive: true },
  { id: "a2", group: a, actualPositive: false, predictedPositive: true },
  { id: "a3", group: a, actualPositive: true, predictedPositive: false },
  { id: "b1", group: b, actualPositive: true, predictedPositive: false },
  { id: "b2", group: b, actualPositive: false, predictedPositive: false },
  { id: "b3", group: b, actualPositive: false, predictedPositive: true },
];

describe("@paideia/fairness-metrics constructors", () => {
  it("constructs group names and probability scores", () => {
    expect(expectOk(groupName(" group-a "))).toBe("group-a");
    expect(expectOk(probabilityScore(0.7))).toBe(0.7);
    expectErrCode(groupName("   "), "precondition-violated");
    expectErrCode(probabilityScore(1.2), "out-of-domain");
  });
});

describe("@paideia/fairness-metrics group audit", () => {
  it("computes confusion counts by group", () => {
    const counts = expectOk(confusionCountsByGroup(examples, [a, b]));
    expect(counts).toHaveLength(2);
    expect(counts[0]).toMatchObject({
      group: a,
      truePositive: 1,
      falsePositive: 1,
      trueNegative: 0,
      falseNegative: 1,
      total: 3,
      actualPositive: 2,
      actualNegative: 1,
      predictedPositive: 2,
      predictedNegative: 1,
    });
    expect(Object.isFrozen(counts)).toBe(true);
    expect(Object.isFrozen(counts[0])).toBe(true);
  });

  it("computes rates and common fairness gaps", () => {
    const metrics = expectOk(rateMetricsByGroup(expectOk(confusionCountsByGroup(examples))));
    expect(metrics[0]?.selectionRate).toBeCloseTo(2 / 3, 12);
    expect(metrics[0]?.truePositiveRate).toBeCloseTo(1 / 2, 12);
    expect(metrics[1]?.falsePositiveRate).toBeCloseTo(1 / 2, 12);

    const demographic = expectOk(demographicParityGap(metrics));
    expect(demographic.metric).toBe("selectionRate");
    expect(demographic.gap).toBeCloseTo(1 / 3, 12);

    const opportunity = expectOk(equalOpportunityGap(metrics));
    expect(opportunity.metric).toBe("truePositiveRate");
    expect(opportunity.gap).toBeCloseTo(1 / 2, 12);

    const odds = expectOk(equalizedOddsMaxGap(metrics));
    expect(odds.maxGap).toBeCloseTo(1 / 2, 12);
  });

  it("builds a complete immutable audit report", () => {
    const report = expectOk(groupAuditReport(examples));
    expect(report.groups).toEqual([a, b]);
    expect(report.metrics).toHaveLength(2);
    expect(report.demographicParityGap.gap).toBeGreaterThan(0);
    expect(Object.isFrozen(report)).toBe(true);
    expect(Object.isFrozen(report.groups)).toBe(true);
  });

  it("rejects invalid examples, groups, and count totals", () => {
    expectErrCode(confusionCountsByGroup([], [a, b]), "precondition-violated");
    expectErrCode(confusionCountsByGroup(examples, [a]), "out-of-domain");
    expectErrCode(confusionCountsByGroup([
      { id: " ", group: a, actualPositive: true, predictedPositive: true },
      { id: "b", group: b, actualPositive: true, predictedPositive: false },
    ]), "precondition-violated");
    expectErrCode(confusionCountsByGroup([
      { id: "a", group: a, actualPositive: true, predictedPositive: true },
      { id: "b", group: b, actualPositive: "yes" as never, predictedPositive: false },
    ]), "precondition-violated");

    const badCounts: GroupConfusionCounts = {
      group: a,
      truePositive: 1,
      falsePositive: 0,
      trueNegative: 0,
      falseNegative: 0,
      total: 99,
      actualPositive: 1,
      actualNegative: 0,
      predictedPositive: 1,
      predictedNegative: 0,
    };
    expectErrCode(rateMetricsByGroup([badCounts, { ...badCounts, group: b }]), "precondition-violated");
  });

  it("allows rate metrics for one group while gap functions require two groups", () => {
    const oneGroupCounts = expectOk(confusionCountsByGroup([
      { id: "a1", group: a, actualPositive: true, predictedPositive: true },
      { id: "a2", group: a, actualPositive: false, predictedPositive: false },
    ]));
    const oneGroupMetrics = expectOk(rateMetricsByGroup(oneGroupCounts));
    expect(oneGroupMetrics).toHaveLength(1);
    expectErrCode(demographicParityGap(oneGroupMetrics), "precondition-violated");
  });

  it("count totals always conserve the number of examples", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            actualPositive: fc.boolean(),
            predictedPositive: fc.boolean(),
            groupIndex: fc.integer({ min: 0, max: 1 }),
          }),
          { minLength: 2, maxLength: 60 },
        ).filter((rows) => rows.some((row) => row.groupIndex === 0) && rows.some((row) => row.groupIndex === 1)),
        (rows) => {
          const generated = rows.map((row, index): BinaryGroupExample => ({
            id: `case-${index}`,
            group: row.groupIndex === 0 ? a : b,
            actualPositive: row.actualPositive,
            predictedPositive: row.predictedPositive,
          }));
          const counts = expectOk(confusionCountsByGroup(generated, [a, b]));
          expect(counts.reduce((sum, count) => sum + count.total, 0)).toBe(generated.length);
          for (const count of counts) {
            expect(count.truePositive + count.falsePositive + count.trueNegative + count.falseNegative).toBe(count.total);
          }
        },
      ),
    );
  });
});

describe("@paideia/fairness-metrics threshold sweeps", () => {
  it("creates sorted threshold audit points", () => {
    const sweep = expectOk(thresholdSweepSummary([
      { id: "a1", group: a, actualPositive: true, score: expectOk(probabilityScore(0.8)) },
      { id: "a2", group: a, actualPositive: false, score: expectOk(probabilityScore(0.3)) },
      { id: "b1", group: b, actualPositive: true, score: expectOk(probabilityScore(0.4)) },
      { id: "b2", group: b, actualPositive: false, score: expectOk(probabilityScore(0.2)) },
    ], [expectOk(probabilityScore(0.5)), expectOk(probabilityScore(0.25))]));
    expect(sweep.thresholds).toEqual([0.25, 0.5]);
    expect(sweep.points).toHaveLength(2);
    expect(sweep.points[0]?.report.metrics).toHaveLength(2);
  });

  it("rejects duplicate thresholds and invalid scores", () => {
    const threshold = expectOk(probabilityScore(0.5));
    expectErrCode(thresholdSweepSummary([
      { id: "a", group: a, actualPositive: true, score: expectOk(probabilityScore(0.8)) },
      { id: "b", group: b, actualPositive: true, score: expectOk(probabilityScore(0.2)) },
    ], [threshold, threshold]), "precondition-violated");
    expectErrCode(thresholdSweepSummary([
      { id: "a", group: a, actualPositive: true, score: 1.5 as never },
      { id: "b", group: b, actualPositive: true, score: expectOk(probabilityScore(0.2)) },
    ], [threshold]), "out-of-domain");
  });
});
