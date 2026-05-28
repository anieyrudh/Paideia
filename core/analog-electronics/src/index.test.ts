import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { type KernelResult } from "@paideia/shared";
import {
  analogTolerance,
  idealDifferenceAmplifier,
  idealInvertingAmplifier,
  idealInvertingSummer,
  idealNonInvertingAmplifier,
  ohms,
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

describe("@paideia/analog-electronics ideal op-amp stages", () => {
  it("computes inverting, non-inverting, and difference amplifier outputs", () => {
    const inverting = expectOk(idealInvertingAmplifier({
      inputVoltageVolts: volts(0.2),
      inputResistanceOhms: ohms(1_000),
      feedbackResistanceOhms: ohms(10_000),
    }));
    expect(inverting.gainVoltsPerVolt).toBeCloseTo(-10, 12);
    expect(inverting.outputVoltageVolts).toBeCloseTo(-2, 12);
    expect(Object.isFrozen(inverting)).toBe(true);

    const nonInverting = expectOk(idealNonInvertingAmplifier({
      inputVoltageVolts: volts(0.4),
      groundResistanceOhms: ohms(2_000),
      feedbackResistanceOhms: ohms(8_000),
    }));
    expect(nonInverting.gainVoltsPerVolt).toBeCloseTo(5, 12);
    expect(nonInverting.outputVoltageVolts).toBeCloseTo(2, 12);

    const difference = expectOk(idealDifferenceAmplifier({
      nonInvertingInputVoltageVolts: volts(1.2),
      invertingInputVoltageVolts: volts(0.7),
      inputResistanceOhms: ohms(1_000),
      feedbackResistanceOhms: ohms(4_000),
    }));
    expect(difference.gainVoltsPerVolt).toBeCloseTo(4, 12);
    expect(difference.outputVoltageVolts).toBeCloseTo(2, 12);
  });

  it("applies output rail saturation explicitly", () => {
    const positive = expectOk(idealNonInvertingAmplifier({
      inputVoltageVolts: volts(2),
      groundResistanceOhms: ohms(1_000),
      feedbackResistanceOhms: ohms(9_000),
      outputLimit: {
        positiveRailVolts: volts(5),
        negativeRailVolts: volts(-5),
      },
    }));
    expect(positive.idealOutputVoltageVolts).toBeCloseTo(20, 12);
    expect(positive.outputVoltageVolts).toBeCloseTo(5, 12);
    expect(positive.saturation).toBe("positive");

    const negative = expectOk(idealInvertingAmplifier({
      inputVoltageVolts: volts(2),
      inputResistanceOhms: ohms(1_000),
      feedbackResistanceOhms: ohms(10_000),
      outputLimit: {
        positiveRailVolts: volts(5),
        negativeRailVolts: volts(-5),
      },
    }));
    expect(negative.outputVoltageVolts).toBeCloseTo(-5, 12);
    expect(negative.saturation).toBe("negative");
  });

  it("rejects invalid op-amp inputs", () => {
    expectErrCode(idealInvertingAmplifier({
      inputVoltageVolts: volts(1),
      inputResistanceOhms: ohms(0),
      feedbackResistanceOhms: ohms(10_000),
    }), "precondition-violated");
    expectErrCode(idealNonInvertingAmplifier({
      inputVoltageVolts: volts(1),
      groundResistanceOhms: ohms(1_000),
      feedbackResistanceOhms: ohms(10_000),
      outputLimit: {
        positiveRailVolts: volts(-5),
        negativeRailVolts: volts(5),
      },
    }), "out-of-domain");
  });
});

describe("@paideia/analog-electronics inverting summer", () => {
  it("sums weighted inputs without mutating caller arrays", () => {
    const voltages = [volts(0.1), volts(0.2), volts(-0.1)] as const;
    const resistances = [ohms(1_000), ohms(2_000), ohms(1_000)] as const;
    const result = expectOk(idealInvertingSummer({
      inputVoltageVolts: voltages,
      inputResistanceOhms: resistances,
      feedbackResistanceOhms: ohms(10_000),
    }));

    expect(result.outputVoltageVolts).toBeCloseTo(-1, 12);
    expect([...voltages]).toEqual([volts(0.1), volts(0.2), volts(-0.1)]);
    expect([...resistances]).toEqual([ohms(1_000), ohms(2_000), ohms(1_000)]);
    expect(Object.isFrozen(result)).toBe(true);
  });

  it("rejects empty or mismatched summer arrays", () => {
    expectErrCode(idealInvertingSummer({
      inputVoltageVolts: [],
      inputResistanceOhms: [],
      feedbackResistanceOhms: ohms(10_000),
    }), "precondition-violated");
    expectErrCode(idealInvertingSummer({
      inputVoltageVolts: [volts(1), volts(2)],
      inputResistanceOhms: [ohms(1_000)],
      feedbackResistanceOhms: ohms(10_000),
    }), "precondition-violated");
  });
});

describe("@paideia/analog-electronics properties", () => {
  it("keeps inverting gain proportional to feedback resistance", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 100, max: 10_000, noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: 1, max: 50, noNaN: true, noDefaultInfinity: true }),
        (inputResistance, ratio) => {
          const result = expectOk(idealInvertingAmplifier({
            inputVoltageVolts: volts(0.1),
            inputResistanceOhms: ohms(inputResistance),
            feedbackResistanceOhms: ohms(inputResistance * ratio),
          }));
          expect(result.gainVoltsPerVolt).toBeCloseTo(
            -ratio,
            Math.ceil(-Math.log10(analogTolerance.loose)),
          );
        },
      ),
    );
  });
});
