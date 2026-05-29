import { approxEqual, decibels, hertz, metres, metresPerSecond } from "@paideia/shared";
import { describe, expect, it } from "vitest";
import {
  acousticsTolerance,
  beatFrequency,
  dopplerShift,
  frequencyFromSpeed,
  intensityFromLevel,
  resonanceTubeMode,
  soundIntensity,
  soundIntensityLevel,
  soundSpeed,
  wavelengthFromSpeed,
  type SoundIntensity,
} from "./index.js";

const intensity = (value: number): SoundIntensity => {
  const result = soundIntensity(value);
  if (!result.ok) throw new Error(`invalid test intensity ${value}`);
  return result.value;
};

describe("@paideia/acoustics", () => {
  it("computes sound speed and period from frequency and wavelength", () => {
    const result = soundSpeed({
      frequencyHertz: hertz(440),
      wavelengthMetres: metres(0.78),
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.speedMetresPerSecond).toBeCloseTo(343.2);
      expect(result.value.periodSeconds).toBeCloseTo(1 / 440);
      expect(Object.isFrozen(result.value)).toBe(true);
    }
  });

  it("converts between wavelength and frequency from speed", () => {
    const wavelength = wavelengthFromSpeed(hertz(440), metresPerSecond(343.2));
    expect(wavelength.ok).toBe(true);
    if (wavelength.ok) {
      expect(wavelength.value).toBeCloseTo(0.78);
    }

    const frequency = frequencyFromSpeed(metres(0.78), metresPerSecond(343.2));
    expect(frequency.ok).toBe(true);
    if (frequency.ok) {
      expect(frequency.value).toBeCloseTo(440);
    }
  });

  it("computes decibel level and recovers intensity", () => {
    const level = soundIntensityLevel({
      intensityWattsPerSquareMetre: intensity(1e-6),
    });
    expect(level.ok).toBe(true);
    if (level.ok) {
      expect(level.value.levelDecibels).toBeCloseTo(60);
      expect(level.value.referenceIntensityWattsPerSquareMetre).toBeCloseTo(1e-12);
      expect(Object.isFrozen(level.value)).toBe(true);
    }

    const recovered = intensityFromLevel(decibels(60));
    expect(recovered.ok).toBe(true);
    if (recovered.ok) {
      expect(recovered.value).toBeCloseTo(1e-6);
    }
  });

  it("computes beat and average frequency", () => {
    const result = beatFrequency({
      frequencyAHertz: hertz(440),
      frequencyBHertz: hertz(444),
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.beatFrequencyHertz).toBeCloseTo(4);
      expect(result.value.averageFrequencyHertz).toBeCloseTo(442);
    }
  });

  it("computes one-axis Doppler shifts", () => {
    const stationary = dopplerShift({
      sourceFrequencyHertz: hertz(500),
      waveSpeedMetresPerSecond: metresPerSecond(340),
    });
    expect(stationary.ok).toBe(true);
    if (stationary.ok) {
      expect(stationary.value.observedFrequencyHertz).toBeCloseTo(500);
      expect(stationary.value.frequencyRatio).toBeCloseTo(1);
    }

    const approachingSource = dopplerShift({
      sourceFrequencyHertz: hertz(500),
      waveSpeedMetresPerSecond: metresPerSecond(340),
      sourceVelocityMetresPerSecond: metresPerSecond(20),
    });
    expect(approachingSource.ok).toBe(true);
    if (approachingSource.ok) {
      expect(approachingSource.value.observedFrequencyHertz).toBeCloseTo(531.25);
      expect(approachingSource.value.frequencyRatio).toBeGreaterThan(1);
    }
  });

  it("computes open-open and closed-open resonance tube modes", () => {
    const open = resonanceTubeMode({
      kind: "open-open",
      tubeLengthMetres: metres(0.5),
      waveSpeedMetresPerSecond: metresPerSecond(340),
      modeNumber: 2,
    });
    expect(open.ok).toBe(true);
    if (open.ok) {
      expect(open.value.wavelengthMetres).toBeCloseTo(0.5);
      expect(open.value.frequencyHertz).toBeCloseTo(680);
    }

    const closed = resonanceTubeMode({
      kind: "closed-open",
      tubeLengthMetres: metres(0.5),
      waveSpeedMetresPerSecond: metresPerSecond(340),
      modeNumber: 2,
    });
    expect(closed.ok).toBe(true);
    if (closed.ok) {
      expect(closed.value.wavelengthMetres).toBeCloseTo(4 * 0.5 / 3);
      expect(closed.value.frequencyHertz).toBeCloseTo(510);
    }
  });

  it("applies end correction to resonance length", () => {
    const result = resonanceTubeMode({
      kind: "closed-open",
      tubeLengthMetres: metres(0.5),
      endCorrectionMetres: metres(0.02),
      waveSpeedMetresPerSecond: metresPerSecond(340),
      modeNumber: 1,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.effectiveLengthMetres).toBeCloseTo(0.52);
      expect(result.value.wavelengthMetres).toBeCloseTo(2.08);
    }
  });

  it("returns out-of-domain errors for invalid physical inputs", () => {
    expect(soundIntensity(0).ok).toBe(false);
    expect(soundSpeed({ frequencyHertz: hertz(0), wavelengthMetres: metres(1) }).ok).toBe(false);
    expect(wavelengthFromSpeed(hertz(-1), metresPerSecond(340)).ok).toBe(false);

    const impossibleDoppler = dopplerShift({
      sourceFrequencyHertz: hertz(500),
      waveSpeedMetresPerSecond: metresPerSecond(340),
      sourceVelocityMetresPerSecond: metresPerSecond(340),
    });
    expect(impossibleDoppler.ok).toBe(false);
    if (!impossibleDoppler.ok) expect(impossibleDoppler.error.code).toBe("out-of-domain");
  });

  it("returns precondition errors for invalid resonance definitions", () => {
    const badMode = resonanceTubeMode({
      kind: "open-open",
      tubeLengthMetres: metres(0.5),
      waveSpeedMetresPerSecond: metresPerSecond(340),
      modeNumber: 0,
    });
    expect(badMode.ok).toBe(false);
    if (!badMode.ok) expect(badMode.error.code).toBe("precondition-violated");

    const badKind = resonanceTubeMode({
      kind: "half-open" as "open-open",
      tubeLengthMetres: metres(0.5),
      waveSpeedMetresPerSecond: metresPerSecond(340),
      modeNumber: 1,
    });
    expect(badKind.ok).toBe(false);
    if (!badKind.ok) expect(badKind.error.code).toBe("precondition-violated");
  });

  it("reports numerical instability for overflowing intensity conversion", () => {
    const result = intensityFromLevel(decibels(Number.MAX_VALUE));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("numerical-instability");
  });

  it("keeps Doppler ratio monotone for an approaching source", () => {
    const base = dopplerShift({
      sourceFrequencyHertz: hertz(500),
      waveSpeedMetresPerSecond: metresPerSecond(340),
      sourceVelocityMetresPerSecond: metresPerSecond(0),
    });
    const faster = dopplerShift({
      sourceFrequencyHertz: hertz(500),
      waveSpeedMetresPerSecond: metresPerSecond(340),
      sourceVelocityMetresPerSecond: metresPerSecond(40),
    });

    expect(base.ok).toBe(true);
    expect(faster.ok).toBe(true);
    if (base.ok && faster.ok) {
      expect(faster.value.frequencyRatio).toBeGreaterThan(base.value.frequencyRatio);
      expect(
        approxEqual(
          faster.value.observedFrequencyHertz,
          500 * faster.value.frequencyRatio,
          acousticsTolerance.tight,
        ),
      ).toBe(true);
    }
  });
});
