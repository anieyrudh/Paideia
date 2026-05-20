// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { approxEqual } from "@paideia/shared";
import { circuitsModel } from "./circuits.js";
import { runCircuitsGateContract } from "./circuits.contract.js";

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
});

runCircuitsGateContract();
