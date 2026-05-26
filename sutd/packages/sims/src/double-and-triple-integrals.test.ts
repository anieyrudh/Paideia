import { approxEqual } from "@paideia/shared";
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { integralEvidence } from "./double-and-triple-integrals.js";

const unwrap = <T,>(result: { readonly ok: true; readonly value: T } | { readonly ok: false }): T => {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error("expected ok result");
  return result.value;
};

describe("double and triple integrals evidence", () => {
  it("accumulates constant density over generated rectangles", () => {
    fc.assert(
      fc.property(
        fc.record({
          xMax: fc.double({ min: 1, max: 5, noDefaultInfinity: true, noNaN: true }),
          yMax: fc.double({ min: 1, max: 5, noDefaultInfinity: true, noNaN: true }),
          zMax: fc.double({ min: 1, max: 4, noDefaultInfinity: true, noNaN: true }),
        }),
        ({ xMax, yMax, zMax }) => {
          const evidence = unwrap(integralEvidence({ densityKind: "constant", xMax, yMax, zMax }));

          expect(approxEqual(evidence.baseIntegral, 2 * xMax * yMax, 1e-8)).toBe(true);
          expect(approxEqual(evidence.tripleIntegral, 2 * xMax * yMax * zMax, 1e-8)).toBe(true);
        },
      ),
      { seed: 18018, numRuns: 50 },
    );
  });

  it("keeps ramp accumulation monotone when the x bound grows", () => {
    fc.assert(
      fc.property(
        fc.record({
          xMax: fc.double({ min: 1, max: 4.5, noDefaultInfinity: true, noNaN: true }),
          yMax: fc.double({ min: 1, max: 5, noDefaultInfinity: true, noNaN: true }),
          delta: fc.double({ min: 0.05, max: 0.5, noDefaultInfinity: true, noNaN: true }),
        }),
        ({ xMax, yMax, delta }) => {
          const small = unwrap(integralEvidence({ densityKind: "ramp-x", xMax, yMax }));
          const large = unwrap(integralEvidence({ densityKind: "ramp-x", xMax: xMax + delta, yMax }));

          expect(large.baseIntegral).toBeGreaterThan(small.baseIntegral);
          expect(large.densityAtCorner).toBeGreaterThanOrEqual(small.densityAtCorner);
        },
      ),
      { seed: 18019, numRuns: 50 },
    );
  });
});
