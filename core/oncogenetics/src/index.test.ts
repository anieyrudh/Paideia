import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { approxEqual } from "@paideia/shared";

import {
  cellPopulationSize,
  clonalGrowthAfterGenerations,
  compareClonalGrowth,
  fitnessAdvantage,
  multiHitProbability,
  mutationCount,
  mutationRate,
  relativeFitness,
} from "./index.js";

const unwrap = <T>(result: { ok: true; value: T } | { ok: false }): T => {
  if (!result.ok) throw new Error("expected ok result");
  return result.value;
};

const mc = (n: number) => unwrap(mutationCount(n));
const fa = (n: number) => unwrap(fitnessAdvantage(n));
const mr = (n: number) => unwrap(mutationRate(n));
const cps = (n: number) => unwrap(cellPopulationSize(n));

const seed = 0xC0FFEE_01;

describe("constructors", () => {
  it("mutationCount rejects non-integers and negatives", () => {
    expect(mutationCount(0).ok).toBe(true);
    expect(mutationCount(3).ok).toBe(true);
    expect(mutationCount(-1).ok).toBe(false);
    expect(mutationCount(1.5).ok).toBe(false);
  });

  it("fitnessAdvantage accepts zero, rejects negatives", () => {
    expect(fitnessAdvantage(0).ok).toBe(true);
    expect(fitnessAdvantage(-0.1).ok).toBe(false);
  });

  it("mutationRate restricts to [0, 1]", () => {
    expect(mutationRate(0).ok).toBe(true);
    expect(mutationRate(1).ok).toBe(true);
    expect(mutationRate(1.001).ok).toBe(false);
    expect(mutationRate(-0.001).ok).toBe(false);
  });
});

describe("relativeFitness", () => {
  it("equals 1 when there are zero drivers", () => {
    expect(unwrap(relativeFitness(mc(0), fa(0.1))) as number).toBeCloseTo(1, 12);
  });

  it("equals (1 + s)^k for known values", () => {
    expect(unwrap(relativeFitness(mc(3), fa(0.1))) as number).toBeCloseTo(1.331, 12);
    expect(unwrap(relativeFitness(mc(5), fa(0))) as number).toBeCloseTo(1, 12);
  });

  it("is always >= 1 (property test)", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 20 }),
        fc.double({ min: 0, max: 2, noNaN: true, noDefaultInfinity: true }),
        (k, s) => {
          const f = unwrap(relativeFitness(mc(k), fa(s))) as number;
          expect(f).toBeGreaterThanOrEqual(1 - 1e-15);
        },
      ),
      { seed, numRuns: 60 },
    );
  });
});

describe("multiHitProbability", () => {
  it("returns 0 when generations is zero", () => {
    const p = unwrap(
      multiHitProbability({
        populationSize: cps(1e8),
        mutationRate: mr(1e-6),
        requiredDriverHits: mc(2),
        generations: 0,
      }),
    );
    expect(p as number).toBeCloseTo(0, 12);
  });

  it("returns 0 when populationSize is zero", () => {
    const p = unwrap(
      multiHitProbability({
        populationSize: cps(0),
        mutationRate: mr(1e-6),
        requiredDriverHits: mc(2),
        generations: 100,
      }),
    );
    expect(p as number).toBe(0);
  });

  it("approaches 1 with enough cells and generations", () => {
    const p = unwrap(
      multiHitProbability({
        populationSize: cps(1e10),
        mutationRate: mr(1e-3),
        requiredDriverHits: mc(2),
        generations: 1000,
      }),
    );
    expect(p as number).toBeGreaterThan(0.999);
  });

  it("rejects requiredDriverHits = 0", () => {
    const result = multiHitProbability({
      populationSize: cps(1e6),
      mutationRate: mr(1e-3),
      requiredDriverHits: mc(0),
      generations: 100,
    });
    expect(result.ok).toBe(false);
  });

  it("is numerically stable for tiny per-cell probabilities (property)", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 1e-8, max: 1e-4, noNaN: true, noDefaultInfinity: true }),
        fc.integer({ min: 1e6, max: 1e9 }),
        fc.integer({ min: 1, max: 50 }),
        (mu, n, g) => {
          const p = unwrap(
            multiHitProbability({
              populationSize: cps(n),
              mutationRate: mr(mu),
              requiredDriverHits: mc(2),
              generations: g,
            }),
          ) as number;
          expect(Number.isFinite(p)).toBe(true);
          expect(p).toBeGreaterThanOrEqual(0);
          expect(p).toBeLessThanOrEqual(1);
        },
      ),
      { seed, numRuns: 80 },
    );
  });
});

describe("clonalGrowthAfterGenerations", () => {
  it("equals size when generations is zero", () => {
    const r = unwrap(
      clonalGrowthAfterGenerations({
        clone: { drivers: mc(3), passengers: mc(0), size: cps(100) },
        perDriverAdvantage: fa(0.1),
        generations: 0,
      }),
    );
    expect(r as number).toBeCloseTo(100, 12);
  });

  it("equals size when drivers and advantage are zero", () => {
    const r = unwrap(
      clonalGrowthAfterGenerations({
        clone: { drivers: mc(0), passengers: mc(0), size: cps(50) },
        perDriverAdvantage: fa(0),
        generations: 10,
      }),
    );
    expect(r as number).toBeCloseTo(50, 12);
  });

  it("grows multiplicatively (property)", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 8 }),
        fc.double({ min: 0, max: 0.5, noNaN: true, noDefaultInfinity: true }),
        fc.integer({ min: 0, max: 20 }),
        (drivers, s, g) => {
          const r = unwrap(
            clonalGrowthAfterGenerations({
              clone: { drivers: mc(drivers), passengers: mc(0), size: cps(10) },
              perDriverAdvantage: fa(s),
              generations: g,
            }),
          ) as number;
          const expected = 10 * Math.pow(Math.pow(1 + s, drivers), g);
          expect(approxEqual(r, expected, 1e-10)).toBe(true);
        },
      ),
      { seed, numRuns: 60 },
    );
  });
});

describe("compareClonalGrowth", () => {
  it("ratio > 1 when clone A has more drivers", () => {
    const result = unwrap(
      compareClonalGrowth(
        {
          clone: { drivers: mc(5), passengers: mc(0), size: cps(10) },
          perDriverAdvantage: fa(0.1),
          generations: 5,
        },
        {
          clone: { drivers: mc(1), passengers: mc(0), size: cps(10) },
          perDriverAdvantage: fa(0.1),
          generations: 5,
        },
      ),
    );
    expect(result.ratio).toBeGreaterThan(1);
  });

  it("rejects zero-size reference clone", () => {
    const result = compareClonalGrowth(
      {
        clone: { drivers: mc(3), passengers: mc(0), size: cps(10) },
        perDriverAdvantage: fa(0.1),
        generations: 5,
      },
      {
        clone: { drivers: mc(1), passengers: mc(0), size: cps(0) },
        perDriverAdvantage: fa(0.1),
        generations: 5,
      },
    );
    expect(result.ok).toBe(false);
  });
});
