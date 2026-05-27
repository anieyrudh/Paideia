import { describe, expect, it } from "vitest";

import { cascadeEvidence } from "./cell-signalling-pathways.js";

describe("cascadeEvidence", () => {
  it("produces a near-on transcription factor with high ligand, no phosphatase", () => {
    const result = cascadeEvidence({
      ligandLevel: 1,
      phosphataseLevel: 0,
      receptorThreshold: 0.1,
      sensitivity: 8,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.transcriptionFactor).toBeGreaterThan(0.8);
    expect(result.value.verdict).toBe("on");
  });

  it("produces a near-off transcription factor with zero ligand", () => {
    const result = cascadeEvidence({
      ligandLevel: 0,
      phosphataseLevel: 0,
      receptorThreshold: 0.1,
      sensitivity: 8,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.transcriptionFactor).toBeLessThan(0.2);
    expect(result.value.verdict).toBe("off");
  });

  it("flips the verdict to off when the phosphatase is high", () => {
    const result = cascadeEvidence({
      ligandLevel: 1,
      phosphataseLevel: 0.95,
      receptorThreshold: 0.1,
      sensitivity: 8,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.transcriptionFactor).toBeLessThan(0.2);
    expect(result.value.verdict).toBe("off");
  });

  it("returns a non-empty response curve from 0 to 1", () => {
    const result = cascadeEvidence({
      ligandLevel: 0.5,
      phosphataseLevel: 0,
      receptorThreshold: 0.1,
      sensitivity: 8,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.responseCurve.length).toBeGreaterThan(10);
    expect(result.value.responseCurve[0]?.ligand).toBe(0);
    expect(result.value.responseCurve.at(-1)?.ligand).toBe(1);
  });

  it("rejects NaN controls", () => {
    const result = cascadeEvidence({
      ligandLevel: Number.NaN,
      phosphataseLevel: 0,
      receptorThreshold: 0.1,
      sensitivity: 8,
    });
    expect(result.ok).toBe(false);
  });
});
