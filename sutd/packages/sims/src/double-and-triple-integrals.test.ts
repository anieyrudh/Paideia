import { describe, expect, it } from "vitest";
import { integralEvidence } from "./double-and-triple-integrals.js";

const unwrap = <T,>(result: { readonly ok: true; readonly value: T } | { readonly ok: false }): T => {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error("expected ok result");
  return result.value;
};

describe("double and triple integrals evidence", () => {
  it("accumulates constant density over a rectangle", () => {
    const evidence = unwrap(integralEvidence({ densityKind: "constant", xMax: 3, yMax: 2, zMax: 4 }));

    expect(evidence.baseIntegral).toBeCloseTo(12, 10);
    expect(evidence.tripleIntegral).toBeCloseTo(48, 10);
  });

  it("larger x bound increases ramp density accumulation", () => {
    const small = unwrap(integralEvidence({ densityKind: "ramp-x", xMax: 2, yMax: 2 }));
    const large = unwrap(integralEvidence({ densityKind: "ramp-x", xMax: 4, yMax: 2 }));

    expect(large.baseIntegral).toBeGreaterThan(small.baseIntegral);
  });
});
