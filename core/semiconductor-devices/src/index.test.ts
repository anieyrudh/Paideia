import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { type KernelResult } from "@paideia/shared";
import {
  amps,
  ampsPerVoltSquared,
  diodeShockleyCurrent,
  diodeVoltageForCurrent,
  nmosSquareLawOperatingPoint,
  ohms,
  perVolt,
  semiconductorTolerance,
  solveResistiveDiodeLoadLine,
  volts,
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

describe("@paideia/semiconductor-devices diode helpers", () => {
  it("computes Shockley diode current and inverse voltage", () => {
    const current = expectOk(diodeShockleyCurrent({
      diodeVoltageVolts: volts(0.65),
      saturationCurrentAmps: amps(1e-12),
      emissionCoefficient: 1,
      thermalVoltageVolts: volts(0.02585),
    }));
    expect(current).toBeCloseTo(0.083, 2);

    const voltage = expectOk(diodeVoltageForCurrent({
      diodeCurrentAmps: amps(current),
      saturationCurrentAmps: amps(1e-12),
      emissionCoefficient: 1,
      thermalVoltageVolts: volts(0.02585),
    }));
    expect(voltage).toBeCloseTo(0.65, 12);
  });

  it("rejects invalid diode inputs", () => {
    expectErrCode(diodeShockleyCurrent({
      diodeVoltageVolts: volts(0.7),
      saturationCurrentAmps: amps(0),
    }), "precondition-violated");
    expectErrCode(diodeShockleyCurrent({
      diodeVoltageVolts: volts(20),
      saturationCurrentAmps: amps(1e-12),
      thermalVoltageVolts: volts(0.01),
    }), "numerical-instability");
    expectErrCode(diodeVoltageForCurrent({
      diodeCurrentAmps: amps(-1e-12),
      saturationCurrentAmps: amps(1e-12),
    }), "out-of-domain");
  });

  it("keeps diode current monotonic in diode voltage", () => {
    fc.assert(
      fc.property(
        fc.double({ min: -0.2, max: 0.7, noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: -0.2, max: 0.7, noNaN: true, noDefaultInfinity: true }),
        (a, b) => {
          const low = Math.min(a, b);
          const high = Math.max(a, b);
          const lowCurrent = expectOk(diodeShockleyCurrent({
            diodeVoltageVolts: volts(low),
            saturationCurrentAmps: amps(1e-12),
            thermalVoltageVolts: volts(0.02585),
          }));
          const highCurrent = expectOk(diodeShockleyCurrent({
            diodeVoltageVolts: volts(high),
            saturationCurrentAmps: amps(1e-12),
            thermalVoltageVolts: volts(0.02585),
          }));
          expect(highCurrent).toBeGreaterThanOrEqual(
            lowCurrent - semiconductorTolerance.loose,
          );
        },
      ),
    );
  });
});

describe("@paideia/semiconductor-devices load line", () => {
  it("solves a single-resistor diode load line and freezes the result", () => {
    const result = expectOk(solveResistiveDiodeLoadLine({
      supplyVoltageVolts: volts(5),
      seriesResistanceOhms: ohms(1_000),
      saturationCurrentAmps: amps(1e-12),
      thermalVoltageVolts: volts(0.02585),
      maxIterations: 80,
    }));

    expect(result.diodeVoltageVolts).toBeCloseTo(0.574, 3);
    expect(result.diodeCurrentAmps).toBeCloseTo(result.resistorCurrentAmps, 12);
    expect(result.resistorVoltageVolts + result.diodeVoltageVolts).toBeCloseTo(5, 12);
    expect(result.iterations).toBe(80);
    expect(Object.isFrozen(result)).toBe(true);
  });

  it("rejects invalid load-line inputs", () => {
    expectErrCode(solveResistiveDiodeLoadLine({
      supplyVoltageVolts: volts(-1),
      seriesResistanceOhms: ohms(1_000),
      saturationCurrentAmps: amps(1e-12),
    }), "precondition-violated");
    expectErrCode(solveResistiveDiodeLoadLine({
      supplyVoltageVolts: volts(5),
      seriesResistanceOhms: ohms(0),
      saturationCurrentAmps: amps(1e-12),
    }), "precondition-violated");
    expectErrCode(solveResistiveDiodeLoadLine({
      supplyVoltageVolts: volts(5),
      seriesResistanceOhms: ohms(1_000),
      saturationCurrentAmps: amps(1e-12),
      maxIterations: 4,
    }), "precondition-violated");
  });
});

describe("@paideia/semiconductor-devices NMOS square-law model", () => {
  it("computes cutoff, triode, and saturation operating points", () => {
    const cutoff = expectOk(nmosSquareLawOperatingPoint({
      gateSourceVoltageVolts: volts(0.8),
      drainSourceVoltageVolts: volts(2),
      thresholdVoltageVolts: volts(1),
      transconductanceParameterAmpsPerVoltSquared: ampsPerVoltSquared(0.002),
    }));
    expect(cutoff.region).toBe("cutoff");
    expect(cutoff.drainCurrentAmps).toBe(0);
    expect(Object.isFrozen(cutoff)).toBe(true);

    const triode = expectOk(nmosSquareLawOperatingPoint({
      gateSourceVoltageVolts: volts(3.3),
      drainSourceVoltageVolts: volts(1),
      thresholdVoltageVolts: volts(1),
      transconductanceParameterAmpsPerVoltSquared: ampsPerVoltSquared(0.002),
    }));
    expect(triode.region).toBe("triode");
    expect(triode.drainCurrentAmps).toBeCloseTo(0.0036, 12);

    const saturation = expectOk(nmosSquareLawOperatingPoint({
      gateSourceVoltageVolts: volts(3.3),
      drainSourceVoltageVolts: volts(3),
      thresholdVoltageVolts: volts(1),
      transconductanceParameterAmpsPerVoltSquared: ampsPerVoltSquared(0.002),
      channelLengthModulationPerVolt: perVolt(0.02),
    }));
    expect(saturation.region).toBe("saturation");
    expect(saturation.drainCurrentAmps).toBeCloseTo(0.0056074, 12);
  });

  it("rejects invalid MOSFET inputs", () => {
    expectErrCode(nmosSquareLawOperatingPoint({
      gateSourceVoltageVolts: volts(3.3),
      drainSourceVoltageVolts: volts(-1),
      thresholdVoltageVolts: volts(1),
      transconductanceParameterAmpsPerVoltSquared: ampsPerVoltSquared(0.002),
    }), "precondition-violated");
    expectErrCode(nmosSquareLawOperatingPoint({
      gateSourceVoltageVolts: volts(3.3),
      drainSourceVoltageVolts: volts(1),
      thresholdVoltageVolts: volts(1),
      transconductanceParameterAmpsPerVoltSquared: ampsPerVoltSquared(0),
    }), "precondition-violated");
  });

  it("keeps saturation current monotonic in gate-source voltage", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 1, max: 5, noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: 1, max: 5, noNaN: true, noDefaultInfinity: true }),
        (a, b) => {
          const low = Math.min(a, b);
          const high = Math.max(a, b);
          const lowPoint = expectOk(nmosSquareLawOperatingPoint({
            gateSourceVoltageVolts: volts(low),
            drainSourceVoltageVolts: volts(5),
            thresholdVoltageVolts: volts(1),
            transconductanceParameterAmpsPerVoltSquared: ampsPerVoltSquared(0.002),
          }));
          const highPoint = expectOk(nmosSquareLawOperatingPoint({
            gateSourceVoltageVolts: volts(high),
            drainSourceVoltageVolts: volts(5),
            thresholdVoltageVolts: volts(1),
            transconductanceParameterAmpsPerVoltSquared: ampsPerVoltSquared(0.002),
          }));
          expect(highPoint.drainCurrentAmps).toBeGreaterThanOrEqual(
            lowPoint.drainCurrentAmps - semiconductorTolerance.loose,
          );
        },
      ),
    );
  });
});
