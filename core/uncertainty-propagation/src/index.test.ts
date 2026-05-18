import { approxEqual, metres, seconds } from "@paideia/shared";
import { describe, expect, it } from "vitest";
import {
  absoluteUncertainty,
  addSubtractAbsoluteUncertainty,
  chooseLargerUncertaintySource,
  dimensionless,
  formatUncertainty,
  instrumentResolutionUncertainty,
  measuredValue,
  measurementUncertaintyFromSources,
  multiplyDivideRelativeUncertainty,
  percentageUncertainty,
  powerUncertainty,
  relativeUncertainty,
  repeatedReadingUncertainty,
  uncertaintyTolerance,
  type MeasuredValue,
  type UncertaintyQuantity,
  type UncertaintySource,
} from "./index.js";

const q = dimensionless;

const mustMeasure = <TUnit extends UncertaintyQuantity>(
  value: TUnit,
  uncertainty: TUnit,
  opts: { readonly label?: string; readonly unit?: string } = {},
): MeasuredValue<TUnit> => {
  const result = measuredValue(value, uncertainty, opts);
  if (!result.ok) throw new Error(result.error.message);
  return result.value;
};

describe("@paideia/uncertainty-propagation", () => {
  it("constructs measured values with unit brands preserved at the boundary", () => {
    const distance = measuredValue(metres(2), metres(0.02), { label: "distance", unit: "m" });
    expect(distance.ok).toBe(true);
    if (distance.ok) {
      const absolute = absoluteUncertainty(distance.value);
      expect(absolute.ok).toBe(true);
      if (absolute.ok) expect(absolute.value).toBe(metres(0.02));
      expect(distance.value.label).toBe("distance");
      expect(distance.value.unit).toBe("m");
    }
  });

  it("rejects non-finite values and negative absolute uncertainty", () => {
    const infinite = measuredValue(q(Number.POSITIVE_INFINITY), q(0.1));
    expect(infinite.ok).toBe(false);
    if (!infinite.ok) expect(infinite.error.code).toBe("precondition-violated");

    const negative = measuredValue(q(1), q(-0.1));
    expect(negative.ok).toBe(false);
    if (!negative.ok) expect(negative.error.code).toBe("out-of-domain");
  });

  it("computes relative and percentage uncertainty against absolute measured value", () => {
    const current = mustMeasure(q(-5), q(0.25));
    const relative = relativeUncertainty(current);
    const percentage = percentageUncertainty(current);

    expect(relative.ok).toBe(true);
    if (relative.ok) expect(approxEqual(relative.value, 0.05, uncertaintyTolerance.tight)).toBe(true);
    expect(percentage.ok).toBe(true);
    if (percentage.ok) expect(approxEqual(percentage.value, 5, uncertaintyTolerance.tight)).toBe(true);
  });

  it("rejects relative uncertainty for zero-valued measurements", () => {
    const result = relativeUncertainty(mustMeasure(q(0), q(0.1)));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("out-of-domain");
  });

  it("adds absolute uncertainties for addition and subtraction", () => {
    const left = mustMeasure(metres(12), metres(0.3), { label: "a" });
    const right = mustMeasure(metres(5), metres(0.2), { label: "b" });
    const offset = mustMeasure(metres(1), metres(0.1), { label: "c" });

    const result = addSubtractAbsoluteUncertainty([
      { measurement: left },
      { operation: "subtract", measurement: right },
      { operation: "add", measurement: offset },
    ]);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(approxEqual(result.value.value, 8, uncertaintyTolerance.tight)).toBe(true);
      expect(approxEqual(result.value.absoluteUncertainty, 0.6, uncertaintyTolerance.tight)).toBe(true);
      expect(approxEqual(result.value.relativeUncertainty, 0.075, uncertaintyTolerance.tight)).toBe(true);
      expect(result.value.steps.some((step) => step.result === "±0.6")).toBe(true);
    }
  });

  it("honors subtract on the first add/subtract term", () => {
    const result = addSubtractAbsoluteUncertainty([
      { operation: "subtract", measurement: mustMeasure(metres(3), metres(0.2), { label: "a" }) },
      { operation: "add", measurement: mustMeasure(metres(5), metres(0.1), { label: "b" }) },
    ]);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(approxEqual(result.value.value, 2, uncertaintyTolerance.tight)).toBe(true);
      expect(approxEqual(result.value.absoluteUncertainty, 0.3, uncertaintyTolerance.tight)).toBe(true);
      expect(result.value.steps[0]?.expression).toBe("-a + b");
    }
  });

  it("rejects add/subtract propagation when a non-zero uncertainty would produce zero result", () => {
    const result = addSubtractAbsoluteUncertainty([
      { measurement: mustMeasure(metres(2), metres(0.1)) },
      { operation: "subtract", measurement: mustMeasure(metres(2), metres(0.1)) },
    ]);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("out-of-domain");
  });

  it("rejects exact zero propagated values with non-zero uncertainty", () => {
    const result = addSubtractAbsoluteUncertainty([
      { measurement: mustMeasure(q(0), q(1e-14)) },
    ]);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("out-of-domain");
  });

  it("preserves small non-zero propagated values within the default tolerance", () => {
    const result = addSubtractAbsoluteUncertainty([
      { measurement: mustMeasure(q(1e-12), q(1e-14)) },
    ]);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(approxEqual(result.value.value, 1e-12, uncertaintyTolerance.tight)).toBe(true);
      expect(approxEqual(result.value.absoluteUncertainty, 1e-14, uncertaintyTolerance.tight)).toBe(true);
      expect(approxEqual(result.value.relativeUncertainty, 0.01, uncertaintyTolerance.tight)).toBe(true);
      expect(approxEqual(result.value.percentageUncertainty, 1, uncertaintyTolerance.tight)).toBe(true);
    }
  });

  it("preserves small non-zero add/subtract cancellation results", () => {
    const result = addSubtractAbsoluteUncertainty([
      { measurement: mustMeasure(q(1e-12), q(1e-15), { label: "a" }) },
      { operation: "subtract", measurement: mustMeasure(q(9.999e-13), q(1e-15), { label: "b" }) },
    ]);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(approxEqual(result.value.value, 1e-16, uncertaintyTolerance.tight)).toBe(true);
      expect(approxEqual(result.value.absoluteUncertainty, 2e-15, uncertaintyTolerance.tight)).toBe(true);
      expect(Number.isFinite(result.value.relativeUncertainty)).toBe(true);
      expect(Number.isFinite(result.value.percentageUncertainty)).toBe(true);
      expect(result.value.steps[0]?.expression).toBe("a - b");
    }
  });

  it("rejects unknown add/subtract operations at runtime", () => {
    const result = addSubtractAbsoluteUncertainty([
      { operation: "bad" as "add", measurement: mustMeasure(metres(1), metres(0.1)) },
    ]);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("precondition-violated");
  });

  it("adds relative uncertainties for multiplication and division", () => {
    const distance = mustMeasure(metres(2), metres(0.02), { label: "distance", unit: "m" });
    const time = mustMeasure(seconds(0.8), seconds(0.02), { label: "time", unit: "s" });

    const result = multiplyDivideRelativeUncertainty([
      { measurement: distance },
      { operation: "divide", measurement: time },
    ]);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(approxEqual(result.value.value, 2.5, uncertaintyTolerance.tight)).toBe(true);
      expect(approxEqual(result.value.relativeUncertainty, 0.035, uncertaintyTolerance.tight)).toBe(true);
      expect(approxEqual(result.value.percentageUncertainty, 3.5, uncertaintyTolerance.tight)).toBe(true);
      expect(approxEqual(result.value.absoluteUncertainty, 0.0875, uncertaintyTolerance.tight)).toBe(true);
      expect(result.value.steps.map((step) => step.label)).toContain("relative uncertainty");
    }
  });

  it("rejects zero denominator and non-finite multiplicative overflow", () => {
    const zeroDenominator = multiplyDivideRelativeUncertainty([
      { measurement: mustMeasure(q(1), q(0.1)) },
      { operation: "divide", measurement: mustMeasure(q(0), q(0)) },
    ]);
    expect(zeroDenominator.ok).toBe(false);
    if (!zeroDenominator.ok) expect(zeroDenominator.error.code).toBe("out-of-domain");

    const overflow = multiplyDivideRelativeUncertainty([
      { measurement: mustMeasure(q(Number.MAX_VALUE), q(0)) },
      { measurement: mustMeasure(q(2), q(0)) },
    ]);
    expect(overflow.ok).toBe(false);
    if (!overflow.ok) expect(overflow.error.code).toBe("numerical-instability");
  });

  it("honors divide on the first multiply/divide factor", () => {
    const result = multiplyDivideRelativeUncertainty([
      { operation: "divide", measurement: mustMeasure(seconds(2), seconds(0.1), { label: "t" }) },
      { measurement: mustMeasure(metres(10), metres(0.2), { label: "d" }) },
    ]);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(approxEqual(result.value.value, 5, uncertaintyTolerance.tight)).toBe(true);
      expect(approxEqual(result.value.relativeUncertainty, 0.07, uncertaintyTolerance.tight)).toBe(true);
      expect(result.value.steps[0]?.expression).toBe("1 ÷ t × d");
    }
  });

  it("rejects unknown multiply/divide operations at runtime", () => {
    const result = multiplyDivideRelativeUncertainty([
      { operation: "bad" as "multiply", measurement: mustMeasure(q(2), q(0.1)) },
    ]);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("precondition-violated");
  });

  it("applies the simple powers rule", () => {
    const radius = mustMeasure(metres(3), metres(0.06), { label: "r" });
    const result = powerUncertainty(radius, q(2));

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(approxEqual(result.value.value, 9, uncertaintyTolerance.tight)).toBe(true);
      expect(approxEqual(result.value.relativeUncertainty, 0.04, uncertaintyTolerance.tight)).toBe(true);
      expect(approxEqual(result.value.absoluteUncertainty, 0.36, uncertaintyTolerance.tight)).toBe(true);
      expect(result.value.steps[1]?.expression).toContain("|2|");
    }
  });

  it("handles exponent zero and rejects invalid power inputs", () => {
    const exponentZero = powerUncertainty(mustMeasure(metres(0), metres(0.5)), q(0));
    expect(exponentZero.ok).toBe(true);
    if (exponentZero.ok) {
      expect(approxEqual(exponentZero.value.value, 1, uncertaintyTolerance.tight)).toBe(true);
      expect(approxEqual(exponentZero.value.absoluteUncertainty, 0, uncertaintyTolerance.tight)).toBe(true);
    }

    const fractionalNegative = powerUncertainty(mustMeasure(metres(-4), metres(0.1)), q(0.5));
    expect(fractionalNegative.ok).toBe(false);
    if (!fractionalNegative.ok) expect(fractionalNegative.error.code).toBe("numerical-instability");

    const zeroBase = powerUncertainty(mustMeasure(metres(0), metres(0.1)), q(2));
    expect(zeroBase.ok).toBe(false);
    if (!zeroBase.ok) expect(zeroBase.error.code).toBe("out-of-domain");
  });

  it("computes repeated-reading uncertainty as half range without mutating readings", () => {
    const readings = [metres(2.01), metres(2.05), metres(1.99)] as const;
    const before = JSON.stringify(readings);
    const result = repeatedReadingUncertainty(readings, { label: "distance repeats" });

    expect(JSON.stringify(readings)).toBe(before);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(approxEqual(result.value.absoluteUncertainty, 0.03, uncertaintyTolerance.tight)).toBe(true);
      expect(result.value.kind).toBe("repeated-readings");
      expect(result.value.steps[1]?.result).toBe("±0.03");
    }
  });

  it("rejects repeated-reading helpers with too few or non-finite readings", () => {
    const singleton = repeatedReadingUncertainty([metres(1)]);
    expect(singleton.ok).toBe(false);
    if (!singleton.ok) expect(singleton.error.code).toBe("precondition-violated");

    const nonFinite = repeatedReadingUncertainty([metres(1), metres(Number.NaN)]);
    expect(nonFinite.ok).toBe(false);
    if (!nonFinite.ok) expect(nonFinite.error.code).toBe("precondition-violated");
  });

  it("computes instrument-resolution uncertainty under half and full resolution rules", () => {
    const half = instrumentResolutionUncertainty(metres(0.01));
    const full = instrumentResolutionUncertainty(metres(0.01), { rule: "full-resolution" });

    expect(half.ok).toBe(true);
    if (half.ok) expect(approxEqual(half.value.absoluteUncertainty, 0.005, uncertaintyTolerance.tight)).toBe(true);
    expect(full.ok).toBe(true);
    if (full.ok) expect(approxEqual(full.value.absoluteUncertainty, 0.01, uncertaintyTolerance.tight)).toBe(true);
  });

  it("rejects invalid instrument resolutions", () => {
    const result = instrumentResolutionUncertainty(metres(0));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("out-of-domain");
  });

  it("rejects unknown instrument resolution rules at runtime", () => {
    const result = instrumentResolutionUncertainty(metres(0.01), {
      rule: "bad" as "half-resolution",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("precondition-violated");
  });

  it("chooses the larger uncertainty source and appends an explanatory step", () => {
    const repeated: UncertaintySource = {
      kind: "repeated-readings",
      absoluteUncertainty: metres(0.03),
      label: "spread",
      steps: [],
    };
    const instrument: UncertaintySource = {
      kind: "instrument-resolution",
      absoluteUncertainty: metres(0.005),
      label: "resolution",
      steps: [],
    };

    const result = chooseLargerUncertaintySource([instrument, repeated]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.label).toBe("spread");
      expect(result.value.steps.at(-1)?.label).toBe("chosen source");
    }
  });

  it("combines repeated readings and instrument resolution in one helper", () => {
    const result = measurementUncertaintyFromSources({
      repeatedReadings: [metres(9.8), metres(10.1), metres(9.9)],
      instrumentResolution: metres(0.5),
      instrumentResolutionRule: "half-resolution",
      label: "length",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.kind).toBe("instrument-resolution");
      expect(approxEqual(result.value.absoluteUncertainty, 0.25, uncertaintyTolerance.tight)).toBe(true);
    }
  });

  it("rejects source selection with no available sources", () => {
    const result = measurementUncertaintyFromSources({});
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("precondition-violated");
  });

  it("formats measured values for sim display", () => {
    const result = formatUncertainty(mustMeasure(q(2.5), q(0.0875), { unit: "m s^-1" }), {
      places: 2,
    });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBe("2.5 m s^-1 ± 0.09 m s^-1");
  });

  it("rejects invalid formatting places", () => {
    const result = formatUncertainty(mustMeasure(q(1), q(0.1)), { places: -1 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("precondition-violated");
  });

  it("keeps multiplicative relative uncertainty invariant under factor order", () => {
    for (let seed = 1; seed <= 40; seed += 1) {
      const a = mustMeasure(q(seed + 1), q((seed % 5 + 1) / 100));
      const b = mustMeasure(q(seed + 2), q((seed % 7 + 1) / 100));
      const forward = multiplyDivideRelativeUncertainty([{ measurement: a }, { measurement: b }]);
      const backward = multiplyDivideRelativeUncertainty([{ measurement: b }, { measurement: a }]);

      expect(forward.ok).toBe(true);
      expect(backward.ok).toBe(true);
      if (forward.ok && backward.ok) {
        expect(approxEqual(forward.value.value, backward.value.value, uncertaintyTolerance.tight)).toBe(true);
        expect(approxEqual(
          forward.value.relativeUncertainty,
          backward.value.relativeUncertainty,
          uncertaintyTolerance.tight,
        )).toBe(true);
      }
    }
  });

  it("keeps add/subtract absolute uncertainty equal to the sum of inputs", () => {
    for (let seed = 1; seed <= 40; seed += 1) {
      const terms = [
        { measurement: mustMeasure(metres(seed + 10), metres(0.01 * seed)) },
        { operation: "subtract" as const, measurement: mustMeasure(metres(seed), metres(0.02 * seed)) },
        { operation: "add" as const, measurement: mustMeasure(metres(1), metres(0.03 * seed)) },
      ];
      const result = addSubtractAbsoluteUncertainty(terms);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(approxEqual(result.value.absoluteUncertainty, 0.06 * seed, uncertaintyTolerance.tight)).toBe(true);
      }
    }
  });
});
