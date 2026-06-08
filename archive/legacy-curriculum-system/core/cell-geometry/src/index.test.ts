import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { approxEqual } from "@paideia/shared";

import {
  area,
  cylinder,
  diffusionCoefficient,
  diffusionTimeEstimate,
  length,
  slab,
  sphere,
  surfaceToVolumeRatio,
  volume,
  type Area,
  type Length,
  type Volume,
} from "./index.js";

const unwrap = <T>(result: { ok: true; value: T } | { ok: false }): T => {
  if (!result.ok) throw new Error("expected ok result");
  return result.value;
};

const len = (n: number): Length => unwrap(length(n));

const sphereSeed = 0xce11_01;
const cylinderSeed = 0xce11_02;
const savSeed = 0xce11_03;

describe("constructors", () => {
  it("length rejects zero and negative values", () => {
    expect(length(0).ok).toBe(false);
    expect(length(-1).ok).toBe(false);
    expect(length(1).ok).toBe(true);
  });

  it("length rejects NaN and Infinity", () => {
    expect(length(Number.NaN).ok).toBe(false);
    expect(length(Number.POSITIVE_INFINITY).ok).toBe(false);
  });

  it("area accepts zero but rejects negatives", () => {
    expect(area(0).ok).toBe(true);
    expect(area(1e-12).ok).toBe(true);
    expect(area(-1e-12).ok).toBe(false);
  });

  it("volume accepts zero but rejects negatives", () => {
    expect(volume(0).ok).toBe(true);
    expect(volume(1e-18).ok).toBe(true);
    expect(volume(-1e-18).ok).toBe(false);
  });

  it("diffusionCoefficient accepts zero but rejects negatives", () => {
    expect(diffusionCoefficient(0).ok).toBe(true);
    expect(diffusionCoefficient(1e-9).ok).toBe(true);
    expect(diffusionCoefficient(-1e-9).ok).toBe(false);
  });
});

describe("sphere", () => {
  it("computes 4*pi*r^2 and (4/3)*pi*r^3 for r = 1 m", () => {
    const result = sphere({ radius: len(1) });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.surfaceArea as number).toBeCloseTo(4 * Math.PI, 10);
      expect(result.value.volume as number).toBeCloseTo((4 / 3) * Math.PI, 10);
      expect(result.value.surfaceToVolumeRatio as number).toBeCloseTo(3, 10);
    }
  });

  it("SA:V scales as 3/r (property test)", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 1e-9, max: 1e-3, noNaN: true, noDefaultInfinity: true }),
        (r) => {
          const result = sphere({ radius: len(r) });
          expect(result.ok).toBe(true);
          if (result.ok) {
            expect(
              approxEqual(result.value.surfaceToVolumeRatio as number, 3 / r, 1e-9),
            ).toBe(true);
          }
        },
      ),
      { seed: sphereSeed, numRuns: 80 },
    );
  });

  it("rejects zero radius via brand constructor", () => {
    expect(length(0).ok).toBe(false);
  });
});

describe("cylinder", () => {
  it("closed cylinder formulas at r = 1 m, L = 2 m", () => {
    const result = cylinder({ radius: len(1), length: len(2) });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.surfaceArea as number).toBeCloseTo(
        2 * Math.PI * 1 * (1 + 2),
        10,
      );
      expect(result.value.volume as number).toBeCloseTo(Math.PI * 1 * 1 * 2, 10);
    }
  });

  it("SA:V approaches 2/r in the long-rod limit (property test)", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 1e-9, max: 1e-3, noNaN: true, noDefaultInfinity: true }),
        (r) => {
          const longL = 1e6 * r;
          const result = cylinder({ radius: len(r), length: len(longL) });
          expect(result.ok).toBe(true);
          if (result.ok) {
            const sav = result.value.surfaceToVolumeRatio as number;
            expect(sav).toBeGreaterThan(2 / r);
            expect(sav).toBeLessThan(2.001 / r);
          }
        },
      ),
      { seed: cylinderSeed, numRuns: 60 },
    );
  });
});

describe("slab", () => {
  it("rectangular slab formulas at t=1, w=2, d=3 m", () => {
    const result = slab({
      thickness: len(1),
      width: len(2),
      depth: len(3),
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      // S = 2*(t*d + t*w + d*w) = 2*(3 + 2 + 6) = 22
      expect(result.value.surfaceArea as number).toBeCloseTo(22, 10);
      expect(result.value.volume as number).toBeCloseTo(6, 10);
      expect(result.value.surfaceToVolumeRatio as number).toBeCloseTo(22 / 6, 10);
    }
  });

  it("rejects zero thickness", () => {
    expect(length(0).ok).toBe(false);
  });
});

describe("surfaceToVolumeRatio", () => {
  it("returns sa / v for positive volume", () => {
    const result = surfaceToVolumeRatio(
      unwrap(area(10)),
      unwrap(volume(2)),
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value as number).toBeCloseTo(5, 12);
  });

  it("rejects zero volume", () => {
    const result = surfaceToVolumeRatio(
      unwrap(area(10)),
      0 as unknown as Volume,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("out-of-domain");
  });

  it("rejects negative volume even when brand is forged", () => {
    const result = surfaceToVolumeRatio(
      unwrap(area(10)),
      -1e-9 as unknown as Volume,
    );
    expect(result.ok).toBe(false);
  });

  it("rejects negative area even when brand is forged", () => {
    const result = surfaceToVolumeRatio(
      -1e-9 as unknown as Area,
      unwrap(volume(2)),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("precondition-violated");
  });

  it("matches sphere().surfaceToVolumeRatio (property test)", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 1e-9, max: 1e-3, noNaN: true, noDefaultInfinity: true }),
        (r) => {
          const metrics = unwrap(sphere({ radius: len(r) }));
          const sav = unwrap(
            surfaceToVolumeRatio(metrics.surfaceArea, metrics.volume),
          );
          expect(
            approxEqual(
              sav as number,
              metrics.surfaceToVolumeRatio as number,
              1e-12,
            ),
          ).toBe(true);
        },
      ),
      { seed: savSeed, numRuns: 80 },
    );
  });
});

describe("diffusionTimeEstimate", () => {
  it("returns L^2 / (6 D) for L = 1e-6 m, D = 1e-9 m^2/s", () => {
    const result = diffusionTimeEstimate({
      characteristicLength: len(1e-6),
      diffusionCoefficient: unwrap(diffusionCoefficient(1e-9)),
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      // (1e-6)^2 / (6 * 1e-9) = 1e-12 / 6e-9 = 1.667e-4 s
      expect(result.value as number).toBeCloseTo(1e-12 / 6e-9, 14);
    }
  });

  it("rejects zero diffusion coefficient with out-of-domain", () => {
    const result = diffusionTimeEstimate({
      characteristicLength: len(1e-6),
      diffusionCoefficient: unwrap(diffusionCoefficient(0)),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("out-of-domain");
  });

  it("rejects negative diffusion coefficient even when brand is forged", () => {
    const result = diffusionTimeEstimate({
      characteristicLength: len(1e-6),
      diffusionCoefficient: -1e-9 as unknown as ReturnType<
        typeof diffusionCoefficient
      > extends { ok: true; value: infer V }
        ? V
        : never,
    });
    expect(result.ok).toBe(false);
  });

  it("scales quadratically with length (property test)", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 1e-9, max: 1e-4, noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: 1, max: 100, noNaN: true, noDefaultInfinity: true }),
        (l, factor) => {
          const d = unwrap(diffusionCoefficient(1e-9));
          const base = unwrap(
            diffusionTimeEstimate({ characteristicLength: len(l), diffusionCoefficient: d }),
          );
          const scaled = unwrap(
            diffusionTimeEstimate({
              characteristicLength: len(l * factor),
              diffusionCoefficient: d,
            }),
          );
          expect(
            approxEqual(
              scaled as number,
              (base as number) * factor * factor,
              1e-9,
            ),
          ).toBe(true);
        },
      ),
      { seed: 0xce11_04, numRuns: 80 },
    );
  });
});
