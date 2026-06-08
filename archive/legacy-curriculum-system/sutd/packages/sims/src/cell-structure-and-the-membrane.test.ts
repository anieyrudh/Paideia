import { describe, expect, it } from "vitest";

import { membraneEvidence } from "./cell-structure-and-the-membrane.js";

describe("membraneEvidence", () => {
  it("computes a K-dominant resting voltage near -70 mV at body temperature", () => {
    const result = membraneEvidence({
      permeabilityK: 1,
      permeabilityNa: 0.04,
      permeabilityCl: 0.45,
      outsideK: 4,
      radiusMicrometres: 5,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.restingVoltageMillivolts).toBeLessThan(-50);
    expect(result.value.restingVoltageMillivolts).toBeGreaterThan(-95);
    expect(result.value.potassiumNernstMillivolts).toBeCloseTo(-94.7, 0);
    expect(result.value.dominantIon).toBe("K");
  });

  it("shifts the voltage toward Na+ when Na permeability dominates", () => {
    const result = membraneEvidence({
      permeabilityK: 0.05,
      permeabilityNa: 0.9,
      permeabilityCl: 0.45,
      outsideK: 4,
      radiusMicrometres: 5,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.restingVoltageMillivolts).toBeGreaterThan(0);
    expect(result.value.dominantIon).toBe("Na");
  });

  it("returns surface-area-to-volume = 3 / radius", () => {
    const result = membraneEvidence({
      permeabilityK: 1,
      permeabilityNa: 0.04,
      permeabilityCl: 0.45,
      outsideK: 4,
      radiusMicrometres: 5,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const sav = result.value.surfaceToVolumeRatioPerMetre;
    const expected = 3 / (5e-6);
    expect(Math.abs(sav - expected) / expected).toBeLessThan(1e-6);
  });

  it("rejects NaN radius with precondition-violated", () => {
    const result = membraneEvidence({
      permeabilityK: 1,
      permeabilityNa: 0.04,
      permeabilityCl: 0.45,
      outsideK: 4,
      radiusMicrometres: Number.NaN,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("precondition-violated");
  });

  it("rejects all-zero permeabilities", () => {
    const result = membraneEvidence({
      permeabilityK: 0,
      permeabilityNa: 0,
      permeabilityCl: 0,
      outsideK: 4,
      radiusMicrometres: 5,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("out-of-domain");
  });
});
