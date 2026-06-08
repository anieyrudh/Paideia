// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { approxEqual } from "@paideia/shared";
import { circuitsModel } from "./circuits.js";
import { runCircuitsGateContract } from "./circuits.contract.js";

const finitePositive = (min: number, max: number) =>
  fc.double({ min, max, noDefaultInfinity: true, noNaN: true });

describe("circuits sim", () => {
  it("solves a series-parallel circuit with Kirchhoff-consistent currents", () => {
    const model = circuitsModel({
      supplyVoltageVolts: 9,
      seriesResistanceOhms: 20,
      branchAResistanceOhms: 40,
      branchBResistanceOhms: 60,
    });

    expect(model.ok).toBe(true);
    if (!model.ok) throw new Error(model.error.message);
    expect(approxEqual(model.value.parallelEquivalentOhms, 24)).toBe(true);
    expect(approxEqual(model.value.totalResistanceOhms, 44)).toBe(true);
    expect(approxEqual(model.value.totalCurrentAmps, 9 / 44)).toBe(true);
    expect(approxEqual(model.value.branchACurrentAmps + model.value.branchBCurrentAmps, 9 / 44)).toBe(true);
  });

  it("increases total current when the parallel equivalent resistance falls", () => {
    const highBranchResistance = circuitsModel({
      supplyVoltageVolts: 9,
      seriesResistanceOhms: 20,
      branchAResistanceOhms: 80,
      branchBResistanceOhms: 80,
    });
    const lowBranchResistance = circuitsModel({
      supplyVoltageVolts: 9,
      seriesResistanceOhms: 20,
      branchAResistanceOhms: 20,
      branchBResistanceOhms: 20,
    });

    expect(highBranchResistance.ok).toBe(true);
    expect(lowBranchResistance.ok).toBe(true);
    if (!highBranchResistance.ok || !lowBranchResistance.ok) {
      throw new Error("Expected valid circuit models.");
    }
    expect(lowBranchResistance.value.totalCurrentAmps).toBeGreaterThan(
      highBranchResistance.value.totalCurrentAmps,
    );
  });

  it("rejects invalid resistance through the KernelResult error contract", () => {
    const model = circuitsModel({
      supplyVoltageVolts: 9,
      seriesResistanceOhms: 0,
      branchAResistanceOhms: 40,
      branchBResistanceOhms: 60,
    });

    expect(model.ok).toBe(false);
    if (!model.ok) expect(model.error.code).toBe("precondition-violated");
  });

  it("preserves Kirchhoff current balance over valid series-parallel circuits", () => {
    fc.assert(
      fc.property(
        finitePositive(3, 12),
        finitePositive(5, 60),
        finitePositive(10, 100),
        finitePositive(10, 100),
        (supplyVoltageVolts, seriesResistanceOhms, branchAResistanceOhms, branchBResistanceOhms) => {
          const model = circuitsModel({
            supplyVoltageVolts,
            seriesResistanceOhms,
            branchAResistanceOhms,
            branchBResistanceOhms,
          });

          expect(model.ok).toBe(true);
          if (!model.ok) return;
          const expectedParallel =
            1 / (1 / branchAResistanceOhms + 1 / branchBResistanceOhms);
          const expectedTotal = seriesResistanceOhms + expectedParallel;
          const expectedCurrent = supplyVoltageVolts / expectedTotal;
          expect(approxEqual(model.value.parallelEquivalentOhms, expectedParallel, 1e-9)).toBe(true);
          expect(approxEqual(model.value.totalResistanceOhms, expectedTotal, 1e-9)).toBe(true);
          expect(approxEqual(model.value.totalCurrentAmps, expectedCurrent, 1e-9)).toBe(true);
          expect(
            approxEqual(
              model.value.branchACurrentAmps + model.value.branchBCurrentAmps,
              model.value.totalCurrentAmps,
              1e-9,
            ),
          ).toBe(true);
        },
      ),
      { seed: 20260520, numRuns: 80 },
    );
  });

  it("monotonically increases total current when one parallel branch resistance is lowered", () => {
    fc.assert(
      fc.property(
        finitePositive(3, 12),
        finitePositive(5, 60),
        finitePositive(10, 100),
        finitePositive(11, 100),
        finitePositive(10, 99),
        (supplyVoltageVolts, seriesResistanceOhms, branchAResistanceOhms, highBranch, lowBranch) => {
          fc.pre(lowBranch < highBranch);
          const higherResistanceModel = circuitsModel({
            supplyVoltageVolts,
            seriesResistanceOhms,
            branchAResistanceOhms,
            branchBResistanceOhms: highBranch,
          });
          const lowerResistanceModel = circuitsModel({
            supplyVoltageVolts,
            seriesResistanceOhms,
            branchAResistanceOhms,
            branchBResistanceOhms: lowBranch,
          });

          expect(higherResistanceModel.ok).toBe(true);
          expect(lowerResistanceModel.ok).toBe(true);
          if (!higherResistanceModel.ok || !lowerResistanceModel.ok) return;
          expect(lowerResistanceModel.value.totalCurrentAmps).toBeGreaterThan(
            higherResistanceModel.value.totalCurrentAmps,
          );
        },
      ),
      { seed: 20260521, numRuns: 80 },
    );
  });
});

runCircuitsGateContract();
