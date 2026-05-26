import { describe, expect, it } from "vitest";
import { divergenceCurlEvidence } from "./divergence-and-curl";

describe("divergenceCurlEvidence", () => {
  it("identifies vortex curl with zero divergence", () => {
    const result = divergenceCurlEvidence({ fieldKind: "vortex", sampleX: 0, sampleY: 0, strength: 1 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.divergence).toBeCloseTo(0, 5);
    expect(result.value.curl).toBeCloseTo(2, 2);
  });

  it("identifies source divergence with zero curl", () => {
    const result = divergenceCurlEvidence({ fieldKind: "source", sampleX: 0.5, sampleY: -0.5, strength: 1.5 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.divergence).toBeCloseTo(3, 2);
    expect(result.value.curl).toBeCloseTo(0, 5);
  });
});
