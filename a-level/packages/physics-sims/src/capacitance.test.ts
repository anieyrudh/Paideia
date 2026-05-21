// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { approxEqual } from "@paideia/shared";
import {
  capacitanceModel,
  type CapacitanceState,
} from "./capacitance.js";
import { runCapacitanceGateContract } from "./capacitance.contract.js";

const finiteCapacitanceMicrofarads = fc.double({
  min: 100,
  max: 1000,
  noDefaultInfinity: true,
  noNaN: true,
});
const finiteVoltage = fc.double({
  min: 2,
  max: 12,
  noDefaultInfinity: true,
  noNaN: true,
});
const finiteResistanceKilohms = fc.double({
  min: 1,
  max: 20,
  noDefaultInfinity: true,
  noNaN: true,
});

const state = (input: {
  readonly capacitanceMicrofarads: number;
  readonly dischargeResistanceKilohms: number;
  readonly sampleTimeMilliseconds: number;
  readonly supplyVoltageVolts: number;
}): CapacitanceState => input as CapacitanceState;

describe("capacitance sim", () => {
  it("computes charge, stored energy, time constant, and discharge sample with units", () => {
    const model = capacitanceModel(state({
      capacitanceMicrofarads: 470,
      dischargeResistanceKilohms: 5,
      sampleTimeMilliseconds: 1500,
      supplyVoltageVolts: 6,
    }));

    expect(model.ok).toBe(true);
    if (!model.ok) throw new Error(model.error.message);
    expect(approxEqual(model.value.storedChargeCoulombs, 0.00282, 1e-9)).toBe(true);
    expect(approxEqual(model.value.storedEnergyJoules, 0.00846, 1e-9)).toBe(true);
    expect(approxEqual(model.value.timeConstantSeconds, 2.35, 1e-9)).toBe(true);
    expect(approxEqual(model.value.initialCurrentAmps, 0.0012, 1e-9)).toBe(true);
    expect(approxEqual(model.value.dischargeFractionRemaining, Math.exp(-1.5 / 2.35), 1e-9)).toBe(true);
  });

  it("doubles charge and energy when capacitance doubles at fixed voltage", () => {
    const base = capacitanceModel(state({
      capacitanceMicrofarads: 470,
      dischargeResistanceKilohms: 5,
      sampleTimeMilliseconds: 0,
      supplyVoltageVolts: 6,
    }));
    const doubled = capacitanceModel(state({
      capacitanceMicrofarads: 940,
      dischargeResistanceKilohms: 5,
      sampleTimeMilliseconds: 0,
      supplyVoltageVolts: 6,
    }));

    expect(base.ok).toBe(true);
    expect(doubled.ok).toBe(true);
    if (!base.ok || !doubled.ok) throw new Error("Expected valid capacitor models.");
    expect(approxEqual(doubled.value.storedChargeCoulombs / base.value.storedChargeCoulombs, 2, 1e-9)).toBe(true);
    expect(approxEqual(doubled.value.storedEnergyJoules / base.value.storedEnergyJoules, 2, 1e-9)).toBe(true);
  });

  it("quadruples energy when voltage doubles at fixed capacitance", () => {
    const base = capacitanceModel(state({
      capacitanceMicrofarads: 470,
      dischargeResistanceKilohms: 5,
      sampleTimeMilliseconds: 0,
      supplyVoltageVolts: 6,
    }));
    const doubledVoltage = capacitanceModel(state({
      capacitanceMicrofarads: 470,
      dischargeResistanceKilohms: 5,
      sampleTimeMilliseconds: 0,
      supplyVoltageVolts: 12,
    }));

    expect(base.ok).toBe(true);
    expect(doubledVoltage.ok).toBe(true);
    if (!base.ok || !doubledVoltage.ok) throw new Error("Expected valid capacitor models.");
    expect(approxEqual(doubledVoltage.value.storedChargeCoulombs / base.value.storedChargeCoulombs, 2, 1e-9)).toBe(true);
    expect(approxEqual(doubledVoltage.value.storedEnergyJoules / base.value.storedEnergyJoules, 4, 1e-9)).toBe(true);
  });

  it("obeys exponential discharge over valid settings", () => {
    fc.assert(
      fc.property(
        finiteCapacitanceMicrofarads,
        finiteVoltage,
        finiteResistanceKilohms,
        fc.double({ min: 0, max: 5000, noDefaultInfinity: true, noNaN: true }),
        (capacitanceMicrofarads, supplyVoltageVolts, dischargeResistanceKilohms, sampleTimeMilliseconds) => {
          const model = capacitanceModel(state({
            capacitanceMicrofarads,
            dischargeResistanceKilohms,
            sampleTimeMilliseconds,
            supplyVoltageVolts,
          }));

          expect(model.ok).toBe(true);
          if (!model.ok) return;
          const expectedFraction = Math.exp(
            -(sampleTimeMilliseconds / 1000) / model.value.timeConstantSeconds,
          );
          expect(approxEqual(model.value.dischargeFractionRemaining, expectedFraction, 1e-9)).toBe(true);
          expect(
            approxEqual(
              model.value.chargeAtSampleCoulombs / model.value.storedChargeCoulombs,
              expectedFraction,
              1e-9,
            ),
          ).toBe(true);
        },
      ),
      { seed: 20260521, numRuns: 80 },
    );
  });
});

runCapacitanceGateContract();
