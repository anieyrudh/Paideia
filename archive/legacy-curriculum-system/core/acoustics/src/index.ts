import {
  decibels,
  err,
  hertz,
  metres,
  metresPerSecond,
  ok,
  seconds,
  type Brand,
  type Decibels,
  type Hertz,
  type KernelResult,
  type Metres,
  type MetresPerSecond,
  type Seconds,
} from "@paideia/shared";

export const acousticsTolerance = {
  default: 1e-9,
  tight: 1e-12,
  loose: 1e-6,
} as const;

export type SoundIntensity = Brand<number, "Acoustics.SoundIntensity">;
export type ResonanceTubeKind = "open-open" | "closed-open";

export interface SoundSpeedInput {
  readonly frequencyHertz: Hertz;
  readonly wavelengthMetres: Metres;
}

export interface SoundSpeedResult {
  readonly speedMetresPerSecond: MetresPerSecond;
  readonly periodSeconds: Seconds;
}

export interface SoundIntensityLevelInput {
  readonly intensityWattsPerSquareMetre: SoundIntensity;
  readonly referenceIntensityWattsPerSquareMetre?: SoundIntensity;
}

export interface SoundIntensityLevelResult {
  readonly levelDecibels: Decibels;
  readonly intensityWattsPerSquareMetre: SoundIntensity;
  readonly referenceIntensityWattsPerSquareMetre: SoundIntensity;
}

export interface BeatFrequencyInput {
  readonly frequencyAHertz: Hertz;
  readonly frequencyBHertz: Hertz;
}

export interface BeatFrequencyResult {
  readonly beatFrequencyHertz: Hertz;
  readonly averageFrequencyHertz: Hertz;
}

export interface DopplerInput {
  readonly sourceFrequencyHertz: Hertz;
  readonly waveSpeedMetresPerSecond: MetresPerSecond;
  readonly observerVelocityMetresPerSecond?: MetresPerSecond;
  readonly sourceVelocityMetresPerSecond?: MetresPerSecond;
}

export interface DopplerResult {
  readonly observedFrequencyHertz: Hertz;
  readonly frequencyRatio: number;
}

export interface ResonanceTubeInput {
  readonly tubeLengthMetres: Metres;
  readonly waveSpeedMetresPerSecond: MetresPerSecond;
  readonly modeNumber: number;
  readonly kind: ResonanceTubeKind;
  readonly endCorrectionMetres?: Metres;
}

export interface ResonanceTubeResult {
  readonly kind: ResonanceTubeKind;
  readonly modeNumber: number;
  readonly effectiveLengthMetres: Metres;
  readonly wavelengthMetres: Metres;
  readonly frequencyHertz: Hertz;
}

const defaultReferenceIntensity = 1e-12 as SoundIntensity;

export const soundIntensity = (value: number): KernelResult<SoundIntensity> => {
  if (!Number.isFinite(value) || value <= 0) {
    return err("out-of-domain", `soundIntensity must be finite and positive, got ${value}`);
  }
  return ok(value as SoundIntensity);
};

export const soundSpeed = (
  input: SoundSpeedInput,
): KernelResult<SoundSpeedResult> => {
  const frequency = positiveFinite(input.frequencyHertz, "frequencyHertz");
  if (!frequency.ok) return frequency;
  const wavelength = positiveFinite(input.wavelengthMetres, "wavelengthMetres");
  if (!wavelength.ok) return wavelength;

  const speed = input.frequencyHertz * input.wavelengthMetres;
  const period = 1 / input.frequencyHertz;
  const validSpeed = finiteDerived(speed, "speedMetresPerSecond");
  if (!validSpeed.ok) return validSpeed;
  const validPeriod = finiteDerived(period, "periodSeconds");
  if (!validPeriod.ok) return validPeriod;

  return ok(
    Object.freeze({
      speedMetresPerSecond: metresPerSecond(speed),
      periodSeconds: seconds(period),
    }),
  );
};

export const wavelengthFromSpeed = (
  frequencyHertz: Hertz,
  speedMetresPerSecond: MetresPerSecond,
): KernelResult<Metres> => {
  const frequency = positiveFinite(frequencyHertz, "frequencyHertz");
  if (!frequency.ok) return frequency;
  const speed = positiveFinite(speedMetresPerSecond, "speedMetresPerSecond");
  if (!speed.ok) return speed;
  const wavelength = speedMetresPerSecond / frequencyHertz;
  const valid = finiteDerived(wavelength, "wavelengthMetres");
  if (!valid.ok) return valid;
  return ok(metres(wavelength));
};

export const frequencyFromSpeed = (
  wavelengthMetres: Metres,
  speedMetresPerSecond: MetresPerSecond,
): KernelResult<Hertz> => {
  const wavelength = positiveFinite(wavelengthMetres, "wavelengthMetres");
  if (!wavelength.ok) return wavelength;
  const speed = positiveFinite(speedMetresPerSecond, "speedMetresPerSecond");
  if (!speed.ok) return speed;
  const frequency = speedMetresPerSecond / wavelengthMetres;
  const valid = finiteDerived(frequency, "frequencyHertz");
  if (!valid.ok) return valid;
  return ok(hertz(frequency));
};

export const soundIntensityLevel = (
  input: SoundIntensityLevelInput,
): KernelResult<SoundIntensityLevelResult> => {
  const intensity = soundIntensity(input.intensityWattsPerSquareMetre);
  if (!intensity.ok) return intensity;
  const reference = soundIntensity(
    input.referenceIntensityWattsPerSquareMetre ?? defaultReferenceIntensity,
  );
  if (!reference.ok) return reference;
  const level = 10 * Math.log10(intensity.value / reference.value);
  const validLevel = finiteDerived(level, "levelDecibels");
  if (!validLevel.ok) return validLevel;
  return ok(
    Object.freeze({
      levelDecibels: decibels(level),
      intensityWattsPerSquareMetre: intensity.value,
      referenceIntensityWattsPerSquareMetre: reference.value,
    }),
  );
};

export const intensityFromLevel = (
  levelDecibels: Decibels,
  referenceIntensityWattsPerSquareMetre: SoundIntensity = defaultReferenceIntensity,
): KernelResult<SoundIntensity> => {
  const level = finite(levelDecibels, "levelDecibels");
  if (!level.ok) return level;
  const reference = soundIntensity(referenceIntensityWattsPerSquareMetre);
  if (!reference.ok) return reference;
  const intensity = reference.value * 10 ** (levelDecibels / 10);
  const valid = finiteDerived(intensity, "intensityWattsPerSquareMetre");
  if (!valid.ok) return valid;
  return soundIntensity(intensity);
};

export const beatFrequency = (
  input: BeatFrequencyInput,
): KernelResult<BeatFrequencyResult> => {
  const a = positiveFinite(input.frequencyAHertz, "frequencyAHertz");
  if (!a.ok) return a;
  const b = positiveFinite(input.frequencyBHertz, "frequencyBHertz");
  if (!b.ok) return b;
  const beat = Math.abs(input.frequencyAHertz - input.frequencyBHertz);
  const average = (input.frequencyAHertz + input.frequencyBHertz) / 2;
  const validAverage = finiteDerived(average, "averageFrequencyHertz");
  if (!validAverage.ok) return validAverage;
  return ok(
    Object.freeze({
      beatFrequencyHertz: hertz(beat),
      averageFrequencyHertz: hertz(average),
    }),
  );
};

export const dopplerShift = (input: DopplerInput): KernelResult<DopplerResult> => {
  const source = positiveFinite(input.sourceFrequencyHertz, "sourceFrequencyHertz");
  if (!source.ok) return source;
  const speed = positiveFinite(input.waveSpeedMetresPerSecond, "waveSpeedMetresPerSecond");
  if (!speed.ok) return speed;
  const observerVelocity = input.observerVelocityMetresPerSecond ?? metresPerSecond(0);
  const sourceVelocity = input.sourceVelocityMetresPerSecond ?? metresPerSecond(0);
  const observer = finite(observerVelocity, "observerVelocityMetresPerSecond");
  if (!observer.ok) return observer;
  const movingSource = finite(sourceVelocity, "sourceVelocityMetresPerSecond");
  if (!movingSource.ok) return movingSource;
  const denominator = input.waveSpeedMetresPerSecond - sourceVelocity;
  if (denominator <= 0) {
    return err(
      "out-of-domain",
      "waveSpeedMetresPerSecond - sourceVelocityMetresPerSecond must be positive",
    );
  }
  const ratio = (input.waveSpeedMetresPerSecond + observerVelocity) / denominator;
  const observed = input.sourceFrequencyHertz * ratio;
  const validRatio = finiteDerived(ratio, "frequencyRatio");
  if (!validRatio.ok) return validRatio;
  const validObserved = finiteDerived(observed, "observedFrequencyHertz");
  if (!validObserved.ok) return validObserved;
  if (observed <= 0) {
    return err("out-of-domain", "observedFrequencyHertz must be positive");
  }
  return ok(
    Object.freeze({
      observedFrequencyHertz: hertz(observed),
      frequencyRatio: ratio,
    }),
  );
};

export const resonanceTubeMode = (
  input: ResonanceTubeInput,
): KernelResult<ResonanceTubeResult> => {
  const kind =
    input.kind === "open-open" || input.kind === "closed-open"
      ? ok(undefined)
      : err("precondition-violated", `kind must be open-open or closed-open, got ${String(input.kind)}`);
  if (!kind.ok) return kind;
  const length = positiveFinite(input.tubeLengthMetres, "tubeLengthMetres");
  if (!length.ok) return length;
  const speed = positiveFinite(input.waveSpeedMetresPerSecond, "waveSpeedMetresPerSecond");
  if (!speed.ok) return speed;
  if (!Number.isInteger(input.modeNumber) || input.modeNumber < 1) {
    return err(
      "precondition-violated",
      `modeNumber must be a positive integer, got ${input.modeNumber}`,
    );
  }
  const correction = input.endCorrectionMetres ?? metres(0);
  const validCorrection = nonNegativeFinite(correction, "endCorrectionMetres");
  if (!validCorrection.ok) return validCorrection;
  const effectiveLength = input.tubeLengthMetres + correction;
  const validEffective = positiveFinite(effectiveLength, "effectiveLengthMetres");
  if (!validEffective.ok) return validEffective;

  const harmonic =
    input.kind === "open-open" ? input.modeNumber : 2 * input.modeNumber - 1;
  const wavelength =
    input.kind === "open-open"
      ? (2 * effectiveLength) / harmonic
      : (4 * effectiveLength) / harmonic;
  const frequency = input.waveSpeedMetresPerSecond / wavelength;
  const validWavelength = finiteDerived(wavelength, "wavelengthMetres");
  if (!validWavelength.ok) return validWavelength;
  const validFrequency = finiteDerived(frequency, "frequencyHertz");
  if (!validFrequency.ok) return validFrequency;

  return ok(
    Object.freeze({
      kind: input.kind,
      modeNumber: input.modeNumber,
      effectiveLengthMetres: metres(effectiveLength),
      wavelengthMetres: metres(wavelength),
      frequencyHertz: hertz(frequency),
    }),
  );
};

const finite = (value: number, label: string): KernelResult<void> =>
  Number.isFinite(value)
    ? ok(undefined)
    : err("out-of-domain", `${label} must be finite, got ${value}`);

const positiveFinite = (value: number, label: string): KernelResult<void> => {
  const valid = finite(value, label);
  if (!valid.ok) return valid;
  return value > 0
    ? ok(undefined)
    : err("out-of-domain", `${label} must be finite and positive, got ${value}`);
};

const nonNegativeFinite = (value: number, label: string): KernelResult<void> => {
  const valid = finite(value, label);
  if (!valid.ok) return valid;
  return value >= 0
    ? ok(undefined)
    : err("out-of-domain", `${label} must be finite and non-negative, got ${value}`);
};

const finiteDerived = <T extends number>(value: T, label: string): KernelResult<T> =>
  Number.isFinite(value)
    ? ok(value)
    : err("numerical-instability", `${label} overflowed the finite-number model`);
