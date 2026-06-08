// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import fc from "fast-check";
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

  it("keeps resultant and envelope bounded by twice the amplitude", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.2, max: 3, noDefaultInfinity: true, noNaN: true }),
        fc.double({ min: 1, max: 8, noDefaultInfinity: true, noNaN: true }),
        fc.double({ min: 0.5, max: 6, noDefaultInfinity: true, noNaN: true }),
        fc.double({ min: 0, max: 180, noDefaultInfinity: true, noNaN: true }),
        fc.double({ min: 0, max: 8, noDefaultInfinity: true, noNaN: true }),
        fc.double({ min: 0, max: 6, noDefaultInfinity: true, noNaN: true }),
        (amplitude, wavelength, period, phase, position, time) => {
          const model = wavesModel({
            amplitudeMetres: metres(amplitude),
            wavelengthMetres: metres(wavelength),
            periodSeconds: seconds(period),
            phaseDegrees: degrees(phase),
            samplePositionMetres: metres(position),
            timeSeconds: seconds(time),
          });

          expect(model.ok).toBe(true);
          if (!model.ok) return;
          const limit = 2 * amplitude + 1e-9;
          expect(Math.abs(model.value.resultantAtSampleMetres)).toBeLessThanOrEqual(limit);
          expect(model.value.envelopeAmplitudeMetres).toBeGreaterThanOrEqual(-1e-9);
          expect(model.value.envelopeAmplitudeMetres).toBeLessThanOrEqual(limit);
        },
      ),
      { seed: 20260520 },
    );
  });

  it("keeps equal positive and negative phase shifts symmetric at the origin", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.2, max: 3, noDefaultInfinity: true, noNaN: true }),
        fc.double({ min: 1, max: 8, noDefaultInfinity: true, noNaN: true }),
        fc.double({ min: 0.5, max: 6, noDefaultInfinity: true, noNaN: true }),
        fc.double({ min: 1, max: 179, noDefaultInfinity: true, noNaN: true }),
        (amplitude, wavelength, period, phase) => {
          const positive = wavesModel({
            amplitudeMetres: metres(amplitude),
            wavelengthMetres: metres(wavelength),
            periodSeconds: seconds(period),
            phaseDegrees: degrees(phase),
            samplePositionMetres: metres(0),
            timeSeconds: seconds(0),
          });
          const negative = wavesModel({
            amplitudeMetres: metres(amplitude),
            wavelengthMetres: metres(wavelength),
            periodSeconds: seconds(period),
            phaseDegrees: degrees(-phase),
            samplePositionMetres: metres(0),
            timeSeconds: seconds(0),
          });

          expect(positive.ok).toBe(true);
          expect(negative.ok).toBe(true);
          if (!positive.ok || !negative.ok) return;
          expect(
            approxEqual(positive.value.waveBAtSampleMetres, -negative.value.waveBAtSampleMetres, 1e-9),
          ).toBe(true);
          expect(
            approxEqual(
              positive.value.resultantAtSampleMetres,
              -negative.value.resultantAtSampleMetres,
              1e-9,
            ),
          ).toBe(true);
          expect(
            approxEqual(positive.value.envelopeAmplitudeMetres, negative.value.envelopeAmplitudeMetres, 1e-9),
          ).toBe(true);
        },
      ),
      { seed: 20260521 },
    );
  });

  it("rejects non-positive period or wavelength for generated inputs", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.2, max: 3, noDefaultInfinity: true, noNaN: true }),
        fc.double({ max: 0, noDefaultInfinity: true, noNaN: true }),
        fc.double({ max: 0, noDefaultInfinity: true, noNaN: true }),
        (amplitude, wavelength, period) => {
          const invalidPeriod = wavesModel({
            amplitudeMetres: metres(amplitude),
            wavelengthMetres: metres(4),
            periodSeconds: seconds(period),
            phaseDegrees: degrees(0),
            samplePositionMetres: metres(0),
            timeSeconds: seconds(0),
          });
          const invalidWavelength = wavesModel({
            amplitudeMetres: metres(amplitude),
            wavelengthMetres: metres(wavelength),
            periodSeconds: seconds(2),
            phaseDegrees: degrees(0),
            samplePositionMetres: metres(0),
            timeSeconds: seconds(0),
          });

          expect(invalidPeriod.ok).toBe(false);
          if (!invalidPeriod.ok) expect(invalidPeriod.error.code).toBe("precondition-violated");
          expect(invalidWavelength.ok).toBe(false);
          if (!invalidWavelength.ok) expect(invalidWavelength.error.code).toBe("precondition-violated");
        },
      ),
      { seed: 20260522 },
    );
  });
});

runWavesGateContract();
