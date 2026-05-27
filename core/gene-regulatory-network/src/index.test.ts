import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { approxEqual } from "@paideia/shared";

import {
  applyRegulator,
  expressionDerivatives,
  hillActivate,
  hillCoefficient,
  hillRepress,
  molarConcentration,
  rateConstant,
  regulationFactor,
  stepGeneExpression,
  transcriptionRate,
  type ExpressionParams,
  type HillCoefficient,
  type MolarConcentration,
  type RateConstant,
} from "./index.js";

const unwrap = <T>(result: { ok: true; value: T } | { ok: false }): T => {
  if (!result.ok) throw new Error("expected ok result");
  return result.value;
};

const mc = (n: number): MolarConcentration => unwrap(molarConcentration(n));
const rk = (n: number): RateConstant => unwrap(rateConstant(n));
const hc = (n: number): HillCoefficient => unwrap(hillCoefficient(n));

const hillSeed = 0x6e6e_e01;
const stepSeed = 0x6e6e_e02;

describe("constructors", () => {
  it("rateConstant accepts zero, rejects negatives and non-finite", () => {
    expect(rateConstant(0).ok).toBe(true);
    expect(rateConstant(1).ok).toBe(true);
    expect(rateConstant(-1).ok).toBe(false);
    expect(rateConstant(Number.NaN).ok).toBe(false);
    expect(rateConstant(Number.POSITIVE_INFINITY).ok).toBe(false);
  });

  it("molarConcentration accepts zero, rejects negatives", () => {
    expect(molarConcentration(0).ok).toBe(true);
    expect(molarConcentration(-1).ok).toBe(false);
  });

  it("hillCoefficient rejects zero and negatives", () => {
    expect(hillCoefficient(0).ok).toBe(false);
    expect(hillCoefficient(-1).ok).toBe(false);
    expect(hillCoefficient(2).ok).toBe(true);
  });

  it("regulationFactor accepts [0, 1] only", () => {
    expect(regulationFactor(0).ok).toBe(true);
    expect(regulationFactor(0.5).ok).toBe(true);
    expect(regulationFactor(1).ok).toBe(true);
    expect(regulationFactor(-0.0001).ok).toBe(false);
    expect(regulationFactor(1.0001).ok).toBe(false);
  });
});

describe("hillActivate", () => {
  it("returns 0 at zero inducer", () => {
    expect(unwrap(hillActivate(mc(0), mc(1), hc(2))) as number).toBeCloseTo(0, 12);
  });

  it("returns exactly 0.5 at inducer = threshold (property)", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.01, max: 100, noNaN: true, noDefaultInfinity: true }),
        fc.constantFrom(1, 2, 3, 4),
        (k, n) => {
          const r = unwrap(hillActivate(mc(k), mc(k), hc(n)));
          expect(approxEqual(r as number, 0.5, 1e-9)).toBe(true);
        },
      ),
      { seed: hillSeed, numRuns: 40 },
    );
  });

  it("monotonically increases with inducer (property)", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 10, noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: 0.01, max: 100, noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: 1, max: 4, noNaN: true, noDefaultInfinity: true }),
        (i, k, n) => {
          const lower = unwrap(hillActivate(mc(i), mc(k), hc(n))) as number;
          const upper = unwrap(hillActivate(mc(i + 1), mc(k), hc(n))) as number;
          expect(upper).toBeGreaterThanOrEqual(lower);
        },
      ),
      { seed: hillSeed, numRuns: 60 },
    );
  });

  it("rejects zero threshold", () => {
    const result = hillActivate(mc(1), mc(0), hc(2));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("out-of-domain");
  });

  it("rejects forged negative inducer", () => {
    const forged = -1 as unknown as MolarConcentration;
    const result = hillActivate(forged, mc(1), hc(2));
    expect(result.ok).toBe(false);
  });
});

describe("hillRepress", () => {
  it("returns 1 at zero repressor", () => {
    expect(unwrap(hillRepress(mc(0), mc(1), hc(2))) as number).toBeCloseTo(1, 12);
  });

  it("returns 0.5 at repressor = threshold", () => {
    expect(unwrap(hillRepress(mc(2), mc(2), hc(3))) as number).toBeCloseTo(0.5, 9);
  });

  it("hillRepress(x) + hillActivate(x) = 1 at the same parameters (property)", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 100, noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: 0.01, max: 100, noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: 1, max: 4, noNaN: true, noDefaultInfinity: true }),
        (i, k, n) => {
          const a = unwrap(hillActivate(mc(i), mc(k), hc(n))) as number;
          const r = unwrap(hillRepress(mc(i), mc(k), hc(n))) as number;
          expect(approxEqual(a + r, 1, 1e-12)).toBe(true);
        },
      ),
      { seed: hillSeed, numRuns: 80 },
    );
  });
});

describe("applyRegulator", () => {
  it("dispatches to hillActivate for activators", () => {
    const r = unwrap(
      applyRegulator({
        kind: "activator",
        inducer: mc(1),
        threshold: mc(1),
        hillCoefficient: hc(2),
      }),
    );
    expect(r as number).toBeCloseTo(0.5, 12);
  });

  it("dispatches to hillRepress for repressors", () => {
    const r = unwrap(
      applyRegulator({
        kind: "repressor",
        inducer: mc(0),
        threshold: mc(1),
        hillCoefficient: hc(2),
      }),
    );
    expect(r as number).toBeCloseTo(1, 12);
  });

  it("rejects an unknown kind", () => {
    const result = applyRegulator({
      kind: "modulator" as unknown as "activator",
      inducer: mc(1),
      threshold: mc(1),
      hillCoefficient: hc(2),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("precondition-violated");
  });
});

const defaultParams = (): ExpressionParams => ({
  basalTranscriptionRate: rk(0.01),
  maxTranscriptionRate: rk(1),
  translationRatePerMrna: rk(2),
  mRnaDegradationRate: rk(0.1),
  proteinDegradationRate: rk(0.05),
});

describe("transcriptionRate", () => {
  it("returns basal at regulation = 0", () => {
    const rate = unwrap(
      transcriptionRate(defaultParams(), unwrap(regulationFactor(0))),
    );
    expect(rate as number).toBeCloseTo(0.01, 12);
  });

  it("returns max at regulation = 1", () => {
    const rate = unwrap(
      transcriptionRate(defaultParams(), unwrap(regulationFactor(1))),
    );
    expect(rate as number).toBeCloseTo(1, 12);
  });

  it("interpolates linearly in regulation (property)", () => {
    const params = defaultParams();
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 1, noNaN: true, noDefaultInfinity: true }),
        (r) => {
          const expected = 0.01 + (1 - 0.01) * r;
          const rate = unwrap(
            transcriptionRate(params, unwrap(regulationFactor(r))),
          );
          expect(approxEqual(rate as number, expected, 1e-12)).toBe(true);
        },
      ),
      { seed: stepSeed, numRuns: 60 },
    );
  });

  it("rejects max < basal", () => {
    const params: ExpressionParams = {
      ...defaultParams(),
      basalTranscriptionRate: rk(5),
      maxTranscriptionRate: rk(1),
    };
    const result = transcriptionRate(params, unwrap(regulationFactor(0.5)));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("out-of-domain");
  });
});

describe("expressionDerivatives", () => {
  it("dM/dt = transcription - decay * mRNA", () => {
    const params = defaultParams();
    const r = unwrap(regulationFactor(1));
    const state = { mRna: mc(10), protein: mc(0) };
    const d = unwrap(expressionDerivatives(state, params, r));
    expect(d.dMrnaDt).toBeCloseTo(1 - 0.1 * 10, 12);
    expect(d.dProteinDt).toBeCloseTo(2 * 10 - 0.05 * 0, 12);
  });

  it("at steady state mRNA, dM/dt = 0 (property)", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 1, noNaN: true, noDefaultInfinity: true }),
        (r) => {
          const params = defaultParams();
          const transcription = 0.01 + (1 - 0.01) * r;
          const steadyMrna = transcription / 0.1;
          const state = {
            mRna: mc(steadyMrna),
            protein: mc(0),
          };
          const d = unwrap(
            expressionDerivatives(state, params, unwrap(regulationFactor(r))),
          );
          expect(Math.abs(d.dMrnaDt)).toBeLessThan(1e-12);
        },
      ),
      { seed: stepSeed, numRuns: 40 },
    );
  });
});

describe("stepGeneExpression", () => {
  it("identity step when dt = 0", () => {
    const params = defaultParams();
    const state = { mRna: mc(5), protein: mc(3) };
    const r = unwrap(regulationFactor(0.5));
    const next = unwrap(stepGeneExpression(state, params, r, 0));
    expect(next.mRna as number).toBeCloseTo(5, 12);
    expect(next.protein as number).toBeCloseTo(3, 12);
  });

  it("non-negative clamp prevents tiny Euler overshoots", () => {
    // A high decay with a large dt would push mRNA negative; clamp must hold.
    const params: ExpressionParams = {
      ...defaultParams(),
      basalTranscriptionRate: rk(0),
      maxTranscriptionRate: rk(0),
      mRnaDegradationRate: rk(10),
    };
    const state = { mRna: mc(1), protein: mc(0) };
    const next = unwrap(
      stepGeneExpression(state, params, unwrap(regulationFactor(0)), 1),
    );
    expect(next.mRna as number).toBeGreaterThanOrEqual(0);
  });

  it("rejects negative dt", () => {
    const result = stepGeneExpression(
      { mRna: mc(1), protein: mc(0) },
      defaultParams(),
      unwrap(regulationFactor(0.5)),
      -1,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("out-of-domain");
  });

  it("rejects non-finite dt", () => {
    const result = stepGeneExpression(
      { mRna: mc(1), protein: mc(0) },
      defaultParams(),
      unwrap(regulationFactor(0.5)),
      Number.NaN,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("precondition-violated");
  });

  it("approaches steady state under many small Euler steps", () => {
    const params = defaultParams();
    const r = unwrap(regulationFactor(1));
    let state = { mRna: mc(0), protein: mc(0) };
    for (let i = 0; i < 5000; i += 1) {
      state = unwrap(stepGeneExpression(state, params, r, 0.1));
    }
    // Steady-state mRNA = max / k_m = 1 / 0.1 = 10.
    expect(state.mRna as number).toBeCloseTo(10, 1);
    // Steady-state protein = translation * mRNA_ss / k_p = 2 * 10 / 0.05 = 400.
    expect(state.protein as number).toBeCloseTo(400, 0);
  });
});
