// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { approxEqual, degrees, metres, seconds } from "@paideia/shared";
import { runWavesGateContract } from "./waves.contract.js";
import { wavesModel } from "./waves.js";

describe("waves sim", () => {
  it("adds two in-phase waves into constructive interference", () => {
    const model = wavesModel({
      amplitudeMetres: metres(1.5),
      wavelengthMetres: metres(4),
      periodSeconds: seconds(2),
      phaseDegrees: degrees(0),
      samplePositionMetres: metres(1),
      timeSeconds: seconds(0),
    });

    expect(model.ok).toBe(true);
    if (!model.ok) throw new Error(model.error.message);
    expect(approxEqual(model.value.frequencyHertz, 0.5)).toBe(true);
    expect(approxEqual(model.value.waveAAtSampleMetres, 1.5)).toBe(true);
    expect(approxEqual(model.value.waveBAtSampleMetres, 1.5)).toBe(true);
    expect(approxEqual(model.value.resultantAtSampleMetres, 3)).toBe(true);
    expect(approxEqual(model.value.envelopeAmplitudeMetres, 3)).toBe(true);
    expect(model.value.interference).toBe("constructive");
    expect(model.value.trace).toHaveLength(49);
  });

  it("cancels equal waves that are half a cycle out of phase", () => {
    const model = wavesModel({
      amplitudeMetres: metres(2),
      wavelengthMetres: metres(4),
      periodSeconds: seconds(1),
      phaseDegrees: degrees(180),
      samplePositionMetres: metres(1),
      timeSeconds: seconds(0),
    });

    expect(model.ok).toBe(true);
    if (!model.ok) throw new Error(model.error.message);
    expect(approxEqual(model.value.waveAAtSampleMetres, 2)).toBe(true);
    expect(approxEqual(model.value.waveBAtSampleMetres, -2)).toBe(true);
    expect(approxEqual(model.value.resultantAtSampleMetres, 0, 1e-9)).toBe(true);
    expect(approxEqual(model.value.envelopeAmplitudeMetres, 0, 1e-9)).toBe(true);
    expect(model.value.interference).toBe("destructive");
  });

  it("rejects invalid period and wavelength through the KernelResult contract", () => {
    const invalidPeriod = wavesModel({
      amplitudeMetres: metres(1.5),
      wavelengthMetres: metres(4),
      periodSeconds: seconds(0),
      phaseDegrees: degrees(0),
      samplePositionMetres: metres(1),
      timeSeconds: seconds(0),
    });
    const invalidWavelength = wavesModel({
      amplitudeMetres: metres(1.5),
      wavelengthMetres: metres(0),
      periodSeconds: seconds(2),
      phaseDegrees: degrees(0),
      samplePositionMetres: metres(1),
      timeSeconds: seconds(0),
    });

    expect(invalidPeriod.ok).toBe(false);
    if (!invalidPeriod.ok) expect(invalidPeriod.error.code).toBe("precondition-violated");
    expect(invalidWavelength.ok).toBe(false);
    if (!invalidWavelength.ok) expect(invalidWavelength.error.code).toBe("precondition-violated");
  });
});

runWavesGateContract();
