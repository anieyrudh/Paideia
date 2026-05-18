import { describe, expect, it } from "vitest";
import type { KernelResult } from "@paideia/shared";
import {
  baseDimensions,
  compatibleDimensions,
  diagnoseEquation,
  dimension,
  dimensionalAnalysisTolerance,
  dimensionsEqual,
  divideDimensions,
  divideUnits,
  formatDimension,
  formatUnit,
  multiplyDimensions,
  multiplyUnits,
  powerDimension,
  powerUnit,
  unit,
  type Dimension,
  type Unit,
} from "./index.js";

const expectOk = <T>(result: KernelResult<T>): T => {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error("Expected KernelResult.ok");
  return result.value;
};

const expectErrCode = (result: KernelResult<unknown>, code: string): void => {
  expect(result.ok).toBe(false);
  if (!result.ok) expect(result.error.code).toBe(code);
};

const expectSameDimension = (left: Dimension, right: Dimension): void => {
  expect(expectOk(dimensionsEqual(left, right))).toBe(true);
};

describe("@paideia/dimensional-analysis", () => {
  it("constructs base and derived dimensions", () => {
    expect(expectOk(formatDimension(baseDimensions.length))).toBe("L");
    expect(expectOk(formatDimension(baseDimensions.time))).toBe("T");

    const speed = expectOk(divideDimensions(baseDimensions.length, baseDimensions.time));
    expect(expectOk(formatDimension(speed))).toBe("L T^-1");

    const acceleration = expectOk(divideDimensions(speed, baseDimensions.time));
    expect(expectOk(formatDimension(acceleration))).toBe("L T^-2");

    const force = expectOk(multiplyDimensions(baseDimensions.mass, acceleration));
    expect(expectOk(formatDimension(force))).toBe("M L T^-2");
  });

  it("supports dimensionless and fractional powers", () => {
    expect(expectOk(formatDimension(expectOk(dimension())))).toBe("1");

    const area = expectOk(powerDimension(baseDimensions.length, 2));
    expect(expectOk(formatDimension(area))).toBe("L^2");

    const lengthAgain = expectOk(powerDimension(area, 0.5));
    expectSameDimension(lengthAgain, baseDimensions.length);
  });

  it("constructs and combines units with readable symbols", () => {
    const metre = expectOk(unit("m", baseDimensions.length));
    const second = expectOk(unit("s", baseDimensions.time));
    const speedUnit = expectOk(divideUnits(metre, second));
    expect(expectOk(formatUnit(speedUnit))).toBe("m s^-1");
    expect(expectOk(formatDimension(speedUnit.dimension))).toBe("L T^-1");

    const newtonDimension = expectOk(
      multiplyDimensions(
        baseDimensions.mass,
        expectOk(divideDimensions(baseDimensions.length, expectOk(powerDimension(baseDimensions.time, 2)))),
      ),
    );
    const kilogram = expectOk(unit("kg", baseDimensions.mass));
    const metrePerSecondSquared = expectOk(divideUnits(metre, expectOk(powerUnit(second, 2))));
    const newton = expectOk(multiplyUnits(kilogram, metrePerSecondSquared));

    expect(expectOk(formatDimension(newton.dimension))).toBe(expectOk(formatDimension(newtonDimension)));
    expect(expectOk(compatibleDimensions(newton.dimension, newtonDimension))).toBe(true);
  });

  it("reports compatible and incompatible equation diagnostics", () => {
    const speed = expectOk(divideDimensions(baseDimensions.length, baseDimensions.time));
    const sameSpeed = expectOk(dimension({ length: 1, time: -1 }));
    const distancePlusTime = expectOk(multiplyDimensions(baseDimensions.length, baseDimensions.time));

    const valid = expectOk(diagnoseEquation(speed, sameSpeed, { left: "v", right: "s/t" }));
    expect(valid.valid).toBe(true);
    expect(valid.message).toContain("dimensionally compatible");
    expect(valid.differences).toEqual([]);

    const invalid = expectOk(diagnoseEquation(speed, distancePlusTime, { left: "speed", right: "distance times time" }));
    expect(invalid.valid).toBe(false);
    expect(invalid.left).toBe("L T^-1");
    expect(invalid.right).toBe("L T");
    expect(invalid.differences).toEqual([
      { dimension: "time", left: -1, right: 1, delta: -2 },
    ]);
  });

  it("does not mutate caller dimensions or units", () => {
    const lengthBefore = JSON.stringify(baseDimensions.length);
    const metre: Unit = expectOk(unit("m", baseDimensions.length));
    const metreBefore = JSON.stringify(metre);

    expect(Object.isFrozen(baseDimensions)).toBe(true);
    expect(Object.isFrozen(baseDimensions.length)).toBe(true);
    expect(Object.isFrozen(baseDimensions.length.exponents)).toBe(true);
    expect(Object.isFrozen(metre)).toBe(true);

    expectOk(powerDimension(baseDimensions.length, 3));
    expectOk(powerUnit(metre, 3));

    expect(JSON.stringify(baseDimensions.length)).toBe(lengthBefore);
    expect(JSON.stringify(metre)).toBe(metreBefore);
  });

  it("returns KernelResult errors for invalid preconditions", () => {
    expectErrCode(dimension({ length: Number.NaN }), "precondition-violated");
    expectErrCode(powerDimension(baseDimensions.length, Number.POSITIVE_INFINITY), "precondition-violated");
    expectErrCode(unit("", baseDimensions.length), "precondition-violated");
    expectErrCode(unit("cm", baseDimensions.length, 0), "precondition-violated");

    const invalidDimension = { exponents: { ...baseDimensions.length.exponents, time: Number.NaN } };
    expectErrCode(formatDimension(invalidDimension), "precondition-violated");

    const missingExponent = { exponents: { length: 1 } } as unknown as Dimension;
    expectErrCode(formatDimension(missingExponent), "precondition-violated");

    const nullExponent = { exponents: { ...baseDimensions.length.exponents, time: null } } as unknown as Dimension;
    expectErrCode(formatDimension(nullExponent), "precondition-violated");

    const malformedUnit = {
      symbol: 42,
      dimension: baseDimensions.length,
      scale: 1,
    } as unknown as Unit;
    expectErrCode(formatUnit(malformedUnit), "precondition-violated");
  });

  it("property: dimension multiplication is commutative over sampled cases", () => {
    const samples = [
      baseDimensions.length,
      baseDimensions.time,
      baseDimensions.mass,
      expectOk(dimension({ length: 1, time: -1 })),
      expectOk(dimension({ mass: 1, length: -1, time: -2 })),
    ] as const;

    for (const left of samples) {
      for (const right of samples) {
        const leftFirst = expectOk(multiplyDimensions(left, right));
        const rightFirst = expectOk(multiplyDimensions(right, left));
        expectSameDimension(leftFirst, rightFirst);
      }
    }
  });

  it("property: division by the same dimension produces dimensionless", () => {
    const samples = [
      baseDimensions.length,
      baseDimensions.time,
      expectOk(dimension({ mass: 1, length: 1, time: -2 })),
      expectOk(dimension({ electricCurrent: 1, time: 1 })),
    ] as const;

    for (const sample of samples) {
      const quotient = expectOk(divideDimensions(sample, sample));
      expect(expectOk(formatDimension(quotient))).toBe("1");
    }
  });

  it("property: powers distribute over dimension multiplication", () => {
    const samples = [
      [baseDimensions.length, baseDimensions.time, 2],
      [baseDimensions.mass, baseDimensions.length, -1],
      [expectOk(dimension({ length: 1, time: -1 })), baseDimensions.time, 3],
    ] as const;

    for (const [left, right, exponent] of samples) {
      const poweredProduct = expectOk(powerDimension(expectOk(multiplyDimensions(left, right)), exponent));
      const productOfPowers = expectOk(
        multiplyDimensions(expectOk(powerDimension(left, exponent)), expectOk(powerDimension(right, exponent))),
      );
      expectSameDimension(poweredProduct, productOfPowers);
    }
  });

  it("uses the declared tolerance for near-zero exponent cancellation", () => {
    const nearlyDimensionless = expectOk(dimension({ length: dimensionalAnalysisTolerance.zero / 2 }));
    expect(expectOk(formatDimension(nearlyDimensionless))).toBe("1");
    expect(expectOk(dimensionsEqual(nearlyDimensionless, expectOk(dimension())))).toBe(true);
  });
});
