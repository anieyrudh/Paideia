// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { approxEqual } from "@paideia/shared";
import { alternatingCurrentModel } from "./alternating-current.js";
import { runAlternatingCurrentGateContract } from "./alternating-current.contract.js";

const finitePositive = (min: number, max: number) =>
  fc.double({ min, max, noDefaultInfinity: true, noNaN: true });

describe("alternating-current sim", () => {
  it("solves rms current, phase, and power from the circuits kernel", () => {
    const model = alternatingCurrentModel({
      sourceVoltageRmsVolts: 12,
      frequencyHertz: 50,
      resistanceOhms: 40,
      inductanceMilliHenrys: 180,
      capacitanceMicroFarads: 120,
      sampleTimeMilliseconds: 5,
    });

    expect(model.ok).toBe(true);
    if (!model.ok) throw new Error(model.error.message);
    expect(approxEqual(model.value.voltagePeakVolts, 12 * Math.SQRT2)).toBe(true);
    expect(approxEqual(model.value.currentPeakAmps, model.value.solution.currentRmsAmps * Math.SQRT2)).toBe(true);
    expect(approxEqual(model.value.solution.realPowerWatts, model.value.solution.currentRmsAmps ** 2 * 40)).toBe(true);
    expect(approxEqual(model.value.currentPhaseDegrees, -model.value.impedancePhaseDegrees)).toBe(true);
  });

  it("keeps source rms unchanged when only frequency changes but changes load current", () => {
    const lowFrequency = alternatingCurrentModel({
      sourceVoltageRmsVolts: 12,
      frequencyHertz: 40,
      resistanceOhms: 40,
      inductanceMilliHenrys: 180,
      capacitanceMicroFarads: 120,
      sampleTimeMilliseconds: 5,
    });
    const highFrequency = alternatingCurrentModel({
      sourceVoltageRmsVolts: 12,
      frequencyHertz: 120,
      resistanceOhms: 40,
      inductanceMilliHenrys: 180,
      capacitanceMicroFarads: 120,
      sampleTimeMilliseconds: 5,
    });

    expect(lowFrequency.ok).toBe(true);
    expect(highFrequency.ok).toBe(true);
    if (!lowFrequency.ok || !highFrequency.ok) {
      throw new Error("Expected valid AC models.");
    }
    expect(lowFrequency.value.voltagePeakVolts).toBe(highFrequency.value.voltagePeakVolts);
    expect(lowFrequency.value.solution.currentRmsAmps).not.toBe(highFrequency.value.solution.currentRmsAmps);
  });

  it("identifies inductive and capacitive phase direction", () => {
    const inductive = alternatingCurrentModel({
      sourceVoltageRmsVolts: 12,
      frequencyHertz: 50,
      resistanceOhms: 40,
      inductanceMilliHenrys: 260,
      capacitanceMicroFarads: 220,
      sampleTimeMilliseconds: 5,
    });
    const capacitive = alternatingCurrentModel({
      sourceVoltageRmsVolts: 12,
      frequencyHertz: 50,
      resistanceOhms: 40,
      inductanceMilliHenrys: 60,
      capacitanceMicroFarads: 120,
      sampleTimeMilliseconds: 5,
    });

    expect(inductive.ok).toBe(true);
    expect(capacitive.ok).toBe(true);
    if (!inductive.ok || !capacitive.ok) return;
    expect(inductive.value.regime).toBe("inductive");
    expect(inductive.value.currentPhaseDegrees).toBeLessThan(0);
    expect(capacitive.value.regime).toBe("capacitive");
    expect(capacitive.value.currentPhaseDegrees).toBeGreaterThan(0);
  });

  it("rejects invalid AC values through the KernelResult error contract", () => {
    const model = alternatingCurrentModel({
      sourceVoltageRmsVolts: 12,
      frequencyHertz: 0,
      resistanceOhms: 40,
      inductanceMilliHenrys: 180,
      capacitanceMicroFarads: 120,
      sampleTimeMilliseconds: 5,
    });

    expect(model.ok).toBe(false);
    if (!model.ok) expect(model.error.code).toBe("precondition-violated");
  });

  it("preserves the series AC identities over valid generated loads", () => {
    fc.assert(
      fc.property(
        finitePositive(4, 24),
        finitePositive(20, 200),
        finitePositive(10, 120),
        finitePositive(10, 500),
        finitePositive(20, 500),
        (sourceVoltageRmsVolts, frequencyHertz, resistanceOhms, inductanceMilliHenrys, capacitanceMicroFarads) => {
          const model = alternatingCurrentModel({
            sourceVoltageRmsVolts,
            frequencyHertz,
            resistanceOhms,
            inductanceMilliHenrys,
            capacitanceMicroFarads,
            sampleTimeMilliseconds: 5,
          });

          expect(model.ok).toBe(true);
          if (!model.ok) return;
          const angularFrequency = 2 * Math.PI * frequencyHertz;
          const expectedXl = angularFrequency * (inductanceMilliHenrys / 1000);
          const expectedXc = 1 / (angularFrequency * (capacitanceMicroFarads / 1_000_000));
          const expectedX = expectedXl - expectedXc;
          const expectedMagnitude = Math.hypot(resistanceOhms, expectedX);
          expect(approxEqual(model.value.inductiveReactanceOhms, expectedXl, 1e-9)).toBe(true);
          expect(approxEqual(model.value.capacitiveReactanceOhms, expectedXc, 1e-9)).toBe(true);
          expect(approxEqual(model.value.netReactanceOhms, expectedX, 1e-9)).toBe(true);
          expect(approxEqual(model.value.solution.impedanceMagnitudeOhms, expectedMagnitude, 1e-9)).toBe(true);
          expect(approxEqual(model.value.solution.currentRmsAmps, sourceVoltageRmsVolts / expectedMagnitude, 1e-9)).toBe(true);
        },
      ),
      { seed: 20260521, numRuns: 80 },
    );
  });
});

runAlternatingCurrentGateContract();
