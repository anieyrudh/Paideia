// @vitest-environment jsdom

import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { approxEqual } from "@paideia/shared";
import { cltSamplerModel, type PopulationKind } from "./central-limit-theorem.js";

describe("central-limit-theorem sim", () => {
  it("keeps sample means centred on the population mean", () => {
    const result = cltSamplerModel({
      population: "right-skewed",
      sampleCount: 160,
      sampleSize: 16,
      seed: 17,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(approxEqual(result.value.populationMean, 1.75, 1e-12)).toBe(true);
    expect(approxEqual(result.value.sampleMeanAverage, result.value.populationMean, 0.25)).toBe(true);
    expect(result.value.histogramBins).toBe(8);
  });

  it("shrinks standard error as sample size grows", () => {
    const small = cltSamplerModel({
      population: "two-cluster",
      sampleCount: 160,
      sampleSize: 4,
      seed: 23,
    });
    const large = cltSamplerModel({
      population: "two-cluster",
      sampleCount: 160,
      sampleSize: 64,
      seed: 23,
    });

    expect(small.ok).toBe(true);
    expect(large.ok).toBe(true);
    if (!small.ok || !large.ok) return;
    expect(large.value.standardError).toBeLessThan(small.value.standardError);
    expect(approxEqual(large.value.standardError, small.value.standardError / 4, 1e-12)).toBe(true);
  });

  it("rejects invalid sample dimensions before sampling", () => {
    expect(
      cltSamplerModel({
        population: "uniform",
        sampleCount: 80,
        sampleSize: 0,
        seed: 1,
      }),
    ).toMatchObject({ ok: false, error: { code: "precondition-violated" } });
    expect(
      cltSamplerModel({
        population: "uniform",
        sampleCount: 2.5,
        sampleSize: 8,
        seed: 1,
      }),
    ).toMatchObject({ ok: false, error: { code: "precondition-violated" } });
  });

  it("preserves CLT invariants across supported populations", () => {
    fc.assert(
      fc.property(
        fc.constantFrom<PopulationKind>("right-skewed", "uniform", "two-cluster"),
        fc.integer({ min: 2, max: 48 }),
        fc.integer({ min: 160, max: 320 }),
        fc.integer({ min: 1, max: 10_000 }),
        (population, sampleSize, sampleCount, seed) => {
          const result = cltSamplerModel({ population, sampleSize, sampleCount, seed });
          expect(result.ok, `seed=${seed}`).toBe(true);
          if (!result.ok) return;

          const larger = cltSamplerModel({
            population,
            sampleCount,
            sampleSize: sampleSize + 1,
            seed,
          });
          expect(larger.ok, `seed=${seed}`).toBe(true);
          if (!larger.ok) return;

          expect(result.value.histogramBins).toBeGreaterThan(0);
          expect(Number.isInteger(result.value.histogramBins)).toBe(true);
          expect(
            approxEqual(
              result.value.standardError,
              result.value.populationStandardDeviation / Math.sqrt(sampleSize),
              1e-12,
            ),
          ).toBe(true);
          expect(larger.value.standardError).toBeLessThan(result.value.standardError);
          expect(
            approxEqual(result.value.sampleMeanAverage, result.value.populationMean, 0.7),
            `seed=${seed}`,
          ).toBe(true);
        },
      ),
    );
  });
});
