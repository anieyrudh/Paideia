import { describe, expect, it } from "vitest";
import { fourierModeEvidence } from "./fourier-mode-superposition.js";

describe("fourier mode superposition evidence", () => {
  it("finds the second mode as dominant for a two-lobed target", () => {
    const evidence = fourierModeEvidence({
      targetShape: "two-lobed",
      coefficient1Metres: 0,
      coefficient2Metres: 0.12,
      coefficient3Metres: 0,
      coefficient4Metres: 0,
      focusMode: 2,
    });

    expect(evidence.ok).toBe(true);
    if (!evidence.ok) return;
    expect(evidence.value.dominantMode).toBe(2);
    expect(evidence.value.projectionCoefficientsMetres[1]).toBeGreaterThan(0.14);
    expect(evidence.value.rmsErrorMetres).toBeLessThan(0.04);
  });
});
