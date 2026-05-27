import { describe, expect, it } from "vitest";

import { solarEvidence } from "./solar-energy-and-band-theory.js";

describe("solarEvidence", () => {
  it("computes photon threshold evidence for a valid solar-band state", () => {
    const result = solarEvidence({
      wavelengthNanometres: 650,
      bandGapElectronVolts: 1.1,
      irradianceWattsPerSquareMetre: 800,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.photonEnergyElectronVolts).toBeCloseTo(1.907, 3);
    expect(result.value.absorbed).toBe(true);
    expect(result.value.estimatedUsablePowerWattsPerSquareMetre).toBeCloseTo(461.35, 2);
  });

  it("returns a KernelResult error for invalid direct state input", () => {
    const result = solarEvidence({
      wavelengthNanometres: 650,
      bandGapElectronVolts: 1.1,
      irradianceWattsPerSquareMetre: Number.NaN,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("out-of-domain");
  });
});
