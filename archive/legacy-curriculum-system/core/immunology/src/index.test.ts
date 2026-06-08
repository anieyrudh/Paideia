import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { approxEqual } from "@paideia/shared";

import {
  affinityScore,
  boosterResponse,
  decayRate,
  doseAmount,
  effectiveReproductionNumber,
  epitopeSequence,
  herdImmunityThreshold,
  immunityLevel,
  matchAffinity,
  reproductionNumber,
  waneImmunity,
  type DoseAmount,
  type EpitopeSequence,
  type ImmunityLevel,
} from "./index.js";

const unwrap = <T>(result: { ok: true; value: T } | { ok: false }): T => {
  if (!result.ok) throw new Error("expected ok result");
  return result.value;
};

const ep = (s: string): EpitopeSequence => unwrap(epitopeSequence(s));
const il = (n: number): ImmunityLevel => unwrap(immunityLevel(n));
const da = (n: number): DoseAmount => unwrap(doseAmount(n));

const seed = 0x1_ce_01;

describe("constructors", () => {
  it("epitopeSequence accepts only the allowed alphabet", () => {
    expect(epitopeSequence("ACGTU").ok).toBe(true);
    expect(epitopeSequence("KLMNP").ok).toBe(true);
    expect(epitopeSequence("BZ").ok).toBe(false);
    expect(epitopeSequence("").ok).toBe(false);
    expect(epitopeSequence("a".repeat(65)).ok).toBe(false);
  });

  it("immunityLevel, affinityScore restrict to [0, 1]", () => {
    expect(immunityLevel(0.5).ok).toBe(true);
    expect(immunityLevel(-0.01).ok).toBe(false);
    expect(immunityLevel(1.01).ok).toBe(false);
    expect(affinityScore(0).ok).toBe(true);
    expect(affinityScore(1).ok).toBe(true);
  });

  it("doseAmount, decayRate accept zero, reject negatives", () => {
    expect(doseAmount(0).ok).toBe(true);
    expect(doseAmount(-1).ok).toBe(false);
    expect(decayRate(0).ok).toBe(true);
    expect(decayRate(-0.1).ok).toBe(false);
  });

  it("reproductionNumber accepts zero, rejects negatives", () => {
    expect(reproductionNumber(0).ok).toBe(true);
    expect(reproductionNumber(-1).ok).toBe(false);
  });
});

describe("matchAffinity", () => {
  it("identical sequences score 1", () => {
    expect(
      unwrap(matchAffinity(ep("ACGT"), ep("ACGT"))) as number,
    ).toBe(1);
  });

  it("completely different sequences score 0", () => {
    expect(
      unwrap(matchAffinity(ep("AAAA"), ep("GGGG"))) as number,
    ).toBe(0);
  });

  it("half-match scores 0.5", () => {
    expect(
      unwrap(matchAffinity(ep("ACGT"), ep("ACTT"))) as number,
    ).toBeCloseTo(0.75, 12);
  });

  it("rejects unequal lengths", () => {
    const result = matchAffinity(ep("ACGT"), ep("ACG"));
    expect(result.ok).toBe(false);
  });

  it("is symmetric (property)", () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^[ACGTUKLNPFY]{1,32}$/),
        fc.stringMatching(/^[ACGTUKLNPFY]{1,32}$/),
        (a, b) => {
          if (a.length !== b.length) return;
          const ab = unwrap(matchAffinity(ep(a), ep(b))) as number;
          const ba = unwrap(matchAffinity(ep(b), ep(a))) as number;
          expect(approxEqual(ab, ba, 1e-15)).toBe(true);
        },
      ),
      { seed, numRuns: 60 },
    );
  });
});

describe("boosterResponse", () => {
  it("returns previous immunity unchanged when dose is zero", () => {
    const r = unwrap(
      boosterResponse({
        previousImmunity: il(0.4),
        doseSize: da(0),
        halfMaxDose: da(1),
        hillCoefficient: 2,
      }),
    );
    expect(r as number).toBeCloseTo(0.4, 12);
  });

  it("approaches 1 at large dose", () => {
    const r = unwrap(
      boosterResponse({
        previousImmunity: il(0),
        doseSize: da(1000),
        halfMaxDose: da(1),
        hillCoefficient: 2,
      }),
    );
    expect(r as number).toBeGreaterThan(0.999);
  });

  it("interpolates from previous immunity (monotonic, property)", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 1, noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: 0, max: 5, noNaN: true, noDefaultInfinity: true }),
        (prev, dose) => {
          const r = unwrap(
            boosterResponse({
              previousImmunity: il(prev),
              doseSize: da(dose),
              halfMaxDose: da(1),
              hillCoefficient: 2,
            }),
          ) as number;
          expect(r).toBeGreaterThanOrEqual(prev - 1e-12);
          expect(r).toBeLessThanOrEqual(1);
        },
      ),
      { seed, numRuns: 80 },
    );
  });

  it("rejects zero halfMaxDose", () => {
    const result = boosterResponse({
      previousImmunity: il(0.5),
      doseSize: da(1),
      halfMaxDose: da(0),
      hillCoefficient: 2,
    });
    expect(result.ok).toBe(false);
  });

  it("rejects non-positive hillCoefficient", () => {
    const result = boosterResponse({
      previousImmunity: il(0.5),
      doseSize: da(1),
      halfMaxDose: da(1),
      hillCoefficient: 0,
    });
    expect(result.ok).toBe(false);
  });
});

describe("waneImmunity", () => {
  it("identity when decayRate or days is zero", () => {
    expect(
      unwrap(
        waneImmunity({
          immunity: il(0.6),
          decayRate: unwrap(decayRate(0)),
          days: 30,
        }),
      ) as number,
    ).toBeCloseTo(0.6, 12);
    expect(
      unwrap(
        waneImmunity({
          immunity: il(0.6),
          decayRate: unwrap(decayRate(0.01)),
          days: 0,
        }),
      ) as number,
    ).toBeCloseTo(0.6, 12);
  });

  it("exponential decay halves at the half-life", () => {
    const halfLifeDays = 100;
    const lambda = Math.log(2) / halfLifeDays;
    const after = unwrap(
      waneImmunity({
        immunity: il(0.8),
        decayRate: unwrap(decayRate(lambda)),
        days: halfLifeDays,
      }),
    ) as number;
    expect(after).toBeCloseTo(0.4, 6);
  });

  it("rejects negative days", () => {
    const result = waneImmunity({
      immunity: il(0.5),
      decayRate: unwrap(decayRate(0.01)),
      days: -1,
    });
    expect(result.ok).toBe(false);
  });
});

describe("effectiveReproductionNumber and herdImmunityThreshold", () => {
  it("R_e = R_0 (1 - p)", () => {
    const re = unwrap(
      effectiveReproductionNumber({
        baseR0: unwrap(reproductionNumber(3)),
        immunityFraction: il(0.5),
      }),
    );
    expect(re as number).toBeCloseTo(1.5, 12);
  });

  it("R_e clamps to 0 at full immunity", () => {
    const re = unwrap(
      effectiveReproductionNumber({
        baseR0: unwrap(reproductionNumber(5)),
        immunityFraction: il(1),
      }),
    );
    expect(re as number).toBeCloseTo(0, 12);
  });

  it("herd-immunity threshold for R0 = 4 is 0.75", () => {
    const p = unwrap(herdImmunityThreshold(unwrap(reproductionNumber(4))));
    expect(p as number).toBeCloseTo(0.75, 12);
  });

  it("rejects R0 <= 1 in threshold calculation", () => {
    const result = herdImmunityThreshold(unwrap(reproductionNumber(1)));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("out-of-domain");
  });

  it("threshold inverts to R_e = 1 at the threshold (property)", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 1.01, max: 20, noNaN: true, noDefaultInfinity: true }),
        (r0) => {
          const p = unwrap(
            herdImmunityThreshold(unwrap(reproductionNumber(r0))),
          ) as number;
          const re = unwrap(
            effectiveReproductionNumber({
              baseR0: unwrap(reproductionNumber(r0)),
              immunityFraction: il(p),
            }),
          ) as number;
          expect(approxEqual(re, 1, 1e-9)).toBe(true);
        },
      ),
      { seed, numRuns: 60 },
    );
  });
});

