import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { approxEqual } from "@paideia/shared";

import {
  dose,
  doseAtResponse,
  effectiveIC50,
  hillCoefficient,
  hillDoseResponse,
  ic50,
  resistanceFactor,
  responseFraction,
  therapeuticIndex,
  type IC50,
} from "./index.js";

const unwrap = <T>(result: { ok: true; value: T } | { ok: false }): T => {
  if (!result.ok) throw new Error("expected ok result");
  return result.value;
};

const d = (n: number) => unwrap(dose(n));
const k = (n: number) => unwrap(ic50(n));
const hc = (n: number) => unwrap(hillCoefficient(n));
const rf = (n: number) => unwrap(resistanceFactor(n));
const tr = (n: number) => unwrap(responseFraction(n));

const seed = 0xDEAFC0DE;

describe("constructors", () => {
  it("dose accepts zero, rejects negatives", () => {
    expect(dose(0).ok).toBe(true);
    expect(dose(-1).ok).toBe(false);
  });

  it("ic50 rejects zero", () => {
    expect(ic50(0).ok).toBe(false);
    expect(ic50(1e-9).ok).toBe(true);
  });

  it("hillCoefficient rejects zero and negatives", () => {
    expect(hillCoefficient(0).ok).toBe(false);
    expect(hillCoefficient(-1).ok).toBe(false);
    expect(hillCoefficient(2).ok).toBe(true);
  });

  it("responseFraction restricted to [0, 1]", () => {
    expect(responseFraction(0).ok).toBe(true);
    expect(responseFraction(1).ok).toBe(true);
    expect(responseFraction(-0.0001).ok).toBe(false);
    expect(responseFraction(1.0001).ok).toBe(false);
  });

  it("resistanceFactor requires >= 1", () => {
    expect(resistanceFactor(1).ok).toBe(true);
    expect(resistanceFactor(10).ok).toBe(true);
    expect(resistanceFactor(0.99).ok).toBe(false);
  });
});

describe("hillDoseResponse", () => {
  it("returns 0 at zero dose", () => {
    const r = unwrap(
      hillDoseResponse({ dose: d(0), ic50: k(1), hillCoefficient: hc(2) }),
    );
    expect(r as number).toBe(0);
  });

  it("returns 0.5 at dose = IC50 (property)", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.01, max: 100, noNaN: true, noDefaultInfinity: true }),
        fc.constantFrom(1, 2, 3, 4),
        (kVal, n) => {
          const r = unwrap(
            hillDoseResponse({
              dose: d(kVal),
              ic50: k(kVal),
              hillCoefficient: hc(n),
            }),
          ) as number;
          expect(approxEqual(r, 0.5, 1e-9)).toBe(true);
        },
      ),
      { seed, numRuns: 40 },
    );
  });

  it("approaches 1 at very large dose", () => {
    const r = unwrap(
      hillDoseResponse({
        dose: d(1e6),
        ic50: k(1),
        hillCoefficient: hc(2),
      }),
    );
    expect(r as number).toBeGreaterThan(0.999);
  });
});

describe("effectiveIC50", () => {
  it("identity when resistanceFactor = 1", () => {
    const r = unwrap(
      effectiveIC50({ baseIC50: k(10), resistanceFactor: rf(1) }),
    );
    expect(r as number).toBeCloseTo(10, 12);
  });

  it("multiplies IC50 by resistance factor", () => {
    const r = unwrap(
      effectiveIC50({ baseIC50: k(5), resistanceFactor: rf(4) }),
    );
    expect(r as number).toBeCloseTo(20, 12);
  });
});

describe("doseAtResponse", () => {
  it("inverts hillDoseResponse for known targets (property)", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.01, max: 100, noNaN: true, noDefaultInfinity: true }),
        fc.constantFrom(1, 2, 3, 4),
        fc.double({ min: 0.01, max: 0.99, noNaN: true, noDefaultInfinity: true }),
        (kVal, n, target) => {
          const dResult = unwrap(
            doseAtResponse({
              ic50: k(kVal),
              hillCoefficient: hc(n),
              targetResponse: tr(target),
            }),
          ) as number;
          const back = unwrap(
            hillDoseResponse({
              dose: d(dResult),
              ic50: k(kVal),
              hillCoefficient: hc(n),
            }),
          ) as number;
          expect(approxEqual(back, target, 1e-9)).toBe(true);
        },
      ),
      { seed, numRuns: 80 },
    );
  });

  it("rejects targetResponse = 0", () => {
    const result = doseAtResponse({
      ic50: k(1),
      hillCoefficient: hc(2),
      targetResponse: tr(0),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("precondition-violated");
  });

  it("rejects targetResponse = 1", () => {
    const result = doseAtResponse({
      ic50: k(1),
      hillCoefficient: hc(2),
      targetResponse: tr(1),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("out-of-domain");
  });
});

describe("therapeuticIndex", () => {
  it("equals toxicDose / effectiveDose", () => {
    const ti = unwrap(
      therapeuticIndex({ toxicDose: d(100), effectiveDose: d(5) }),
    );
    expect(ti as number).toBeCloseTo(20, 12);
  });

  it("rejects zero effectiveDose", () => {
    const result = therapeuticIndex({
      toxicDose: d(100),
      effectiveDose: d(0),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("out-of-domain");
  });
});

describe("resistance scenario", () => {
  it("a resistant clone needs proportionally more dose for the same response", () => {
    const baseIC50 = k(10);
    const baseDose = unwrap(
      doseAtResponse({
        ic50: baseIC50,
        hillCoefficient: hc(2),
        targetResponse: tr(0.9),
      }),
    ) as number;
    const resistantIC50 = unwrap(
      effectiveIC50({ baseIC50, resistanceFactor: rf(4) }),
    ) as unknown as IC50;
    const resistantDose = unwrap(
      doseAtResponse({
        ic50: resistantIC50,
        hillCoefficient: hc(2),
        targetResponse: tr(0.9),
      }),
    ) as number;
    expect(approxEqual(resistantDose / baseDose, 4, 1e-9)).toBe(true);
  });
});
