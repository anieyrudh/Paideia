import {
  err,
  joules,
  metres,
  metresPerSecond,
  ok,
  radians,
  radiansPerSecond,
  seconds,
  type Hertz,
  type Joules,
  type KernelResult,
  type Metres,
  type MetresPerSecond,
  type Radians,
  type RadiansPerSecond,
  type Seconds,
} from "@paideia/shared";
import type { Brand } from "@paideia/shared";

export const waveTolerance = {
  default: 1e-9,
  tight: 1e-12,
  loose: 1e-6,
} as const;

export type RadiansPerMetre = Brand<number, "RadiansPerMetre">;
export type RelativeIntensity = Brand<number, "RelativeIntensity">;
export type WaveDirection = "positive-x" | "negative-x";

export interface WaveKinematicsInput {
  readonly frequencyHertz: Hertz;
  readonly wavelengthMetres: Metres;
}

export interface WaveKinematicsResult {
  readonly speedMetresPerSecond: MetresPerSecond;
  readonly periodSeconds: Seconds;
  readonly angularFrequencyRadiansPerSecond: RadiansPerSecond;
  readonly waveNumberRadiansPerMetre: RadiansPerMetre;
}

export interface PhotonEnergyInput {
  readonly wavelengthMetres: Metres;
}

export interface PhotonEnergyResult {
  readonly wavelengthMetres: Metres;
  readonly frequencyHertz: Hertz;
  readonly energyJoules: Joules;
  readonly energyElectronVolts: number;
}

export interface WaveSampleInput extends WaveKinematicsInput {
  readonly amplitudeMetres: Metres;
  readonly positionMetres: Metres;
  readonly timeSeconds: Seconds;
  readonly phaseRadians?: Radians;
  readonly direction?: WaveDirection;
}

export interface WaveSample {
  readonly displacementMetres: Metres;
  readonly phaseRadians: Radians;
  readonly positionMetres: Metres;
  readonly timeSeconds: Seconds;
}

export interface WaveTraceInput extends WaveKinematicsInput {
  readonly amplitudeMetres: Metres;
  readonly startMetres: Metres;
  readonly endMetres: Metres;
  readonly timeSeconds: Seconds;
  readonly sampleCount?: number;
  readonly phaseRadians?: Radians;
  readonly direction?: WaveDirection;
}

export interface WaveTracePoint extends WaveSample {
  readonly index: number;
}

export interface SuperpositionComponent extends WaveKinematicsInput {
  readonly amplitudeMetres: Metres;
  readonly phaseRadians?: Radians;
  readonly direction?: WaveDirection;
}

export interface SuperpositionInput {
  readonly components: readonly SuperpositionComponent[];
  readonly positionMetres: Metres;
  readonly timeSeconds: Seconds;
}

export interface SuperpositionSample {
  readonly displacementMetres: Metres;
  readonly positionMetres: Metres;
  readonly timeSeconds: Seconds;
}

export interface StandingWaveInput extends WaveKinematicsInput {
  readonly amplitudeMetres: Metres;
  readonly positionMetres: Metres;
  readonly timeSeconds: Seconds;
  readonly phaseRadians?: Radians;
}

export interface BeatInput {
  readonly amplitudeMetres: Metres;
  readonly carrierFrequencyHertz: Hertz;
  readonly beatFrequencyHertz: Hertz;
  readonly timeSeconds: Seconds;
  readonly phaseRadians?: Radians;
}

const maxTraceSamples = 20_001;
const twoPi = 2 * Math.PI;
const speedOfLightMetresPerSecond = 299_792_458;
const planckConstantJouleSeconds = 6.62607015e-34;
const joulesPerElectronVolt = 1.602176634e-19;

const radiansPerMetre = (value: number): RadiansPerMetre => value as RadiansPerMetre;
const relativeIntensity = (value: number): RelativeIntensity => value as RelativeIntensity;

const finite = (value: number, label: string): KernelResult<void> =>
  Number.isFinite(value)
    ? ok(undefined)
    : err("precondition-violated", `${label} must be finite; got ${value}`);

const finiteDerived = (value: number, label: string): KernelResult<void> =>
  Number.isFinite(value)
    ? ok(undefined)
    : err("numerical-instability", `${label} must be finite after computation; got ${value}`);

const positive = (value: number, label: string): KernelResult<void> => {
  const valid = finite(value, label);
  if (!valid.ok) return valid;
  return value > 0
    ? ok(undefined)
    : err("precondition-violated", `${label} must be positive; got ${value}`);
};

const nonNegative = (value: number, label: string): KernelResult<void> => {
  const valid = finite(value, label);
  if (!valid.ok) return valid;
  return value >= 0
    ? ok(undefined)
    : err("precondition-violated", `${label} must be non-negative; got ${value}`);
};

const validateKinematicsInput = (input: WaveKinematicsInput): KernelResult<void> => {
  const frequency = positive(input.frequencyHertz, "frequencyHertz");
  if (!frequency.ok) return frequency;
  return positive(input.wavelengthMetres, "wavelengthMetres");
};

const validateAmplitude = (amplitudeMetres: Metres): KernelResult<void> =>
  finite(amplitudeMetres, "amplitudeMetres");

const validatePositionAndTime = (
  positionMetres: Metres,
  timeSeconds: Seconds,
): KernelResult<void> => {
  const position = finite(positionMetres, "positionMetres");
  if (!position.ok) return position;
  return nonNegative(timeSeconds, "timeSeconds");
};

const phaseFor = (
  input: WaveKinematicsInput & {
    readonly positionMetres: Metres;
    readonly timeSeconds: Seconds;
    readonly phaseRadians?: Radians;
    readonly direction?: WaveDirection;
  },
): KernelResult<Radians> => {
  const kinematics = waveKinematics(input);
  if (!kinematics.ok) return kinematics;
  const offset = input.phaseRadians ?? radians(0);
  const offsetValid = finite(offset, "phaseRadians");
  if (!offsetValid.ok) return offsetValid;

  const spatial = kinematics.value.waveNumberRadiansPerMetre * input.positionMetres;
  const temporal = kinematics.value.angularFrequencyRadiansPerSecond * input.timeSeconds;
  const phase =
    input.direction === "negative-x"
      ? spatial + temporal + offset
      : spatial - temporal + offset;
  const valid = finiteDerived(phase, "phaseRadians");
  if (!valid.ok) return valid;
  return ok(radians(phase));
};

export const waveKinematics = (
  input: WaveKinematicsInput,
): KernelResult<WaveKinematicsResult> => {
  const valid = validateKinematicsInput(input);
  if (!valid.ok) return valid;

  const speedValue = input.frequencyHertz * input.wavelengthMetres;
  const periodValue = 1 / input.frequencyHertz;
  const angularFrequencyValue = twoPi * input.frequencyHertz;
  const waveNumberValue = twoPi / input.wavelengthMetres;

  for (const [label, value] of [
    ["speedMetresPerSecond", speedValue],
    ["periodSeconds", periodValue],
    ["angularFrequencyRadiansPerSecond", angularFrequencyValue],
    ["waveNumberRadiansPerMetre", waveNumberValue],
  ] as const) {
    const computed = finiteDerived(value, label);
    if (!computed.ok) return computed;
  }

  return ok({
    speedMetresPerSecond: metresPerSecond(speedValue),
    periodSeconds: seconds(periodValue),
    angularFrequencyRadiansPerSecond: radiansPerSecond(angularFrequencyValue),
    waveNumberRadiansPerMetre: radiansPerMetre(waveNumberValue),
  });
};

export const photonEnergy = (
  input: PhotonEnergyInput,
): KernelResult<PhotonEnergyResult> => {
  const wavelength = positive(input.wavelengthMetres, "wavelengthMetres");
  if (!wavelength.ok) return wavelength;

  const frequency = speedOfLightMetresPerSecond / input.wavelengthMetres;
  const energyJoules = planckConstantJouleSeconds * frequency;
  const energyElectronVolts = energyJoules / joulesPerElectronVolt;

  for (const [label, value] of [
    ["frequencyHertz", frequency],
    ["energyJoules", energyJoules],
    ["energyElectronVolts", energyElectronVolts],
  ] as const) {
    const computed = finiteDerived(value, label);
    if (!computed.ok) return computed;
  }

  return ok({
    wavelengthMetres: input.wavelengthMetres,
    frequencyHertz: frequency as Hertz,
    energyJoules: joules(energyJoules),
    energyElectronVolts,
  });
};

export const transverseWaveAt = (
  input: WaveSampleInput,
): KernelResult<WaveSample> => {
  const amplitude = validateAmplitude(input.amplitudeMetres);
  if (!amplitude.ok) return amplitude;
  const positionAndTime = validatePositionAndTime(input.positionMetres, input.timeSeconds);
  if (!positionAndTime.ok) return positionAndTime;

  const phase = phaseFor(input);
  if (!phase.ok) return phase;
  const displacement = input.amplitudeMetres * Math.sin(phase.value);
  const validDisplacement = finiteDerived(displacement, "displacement");
  if (!validDisplacement.ok) return validDisplacement;

  return ok({
    displacementMetres: metres(displacement),
    phaseRadians: phase.value,
    positionMetres: input.positionMetres,
    timeSeconds: input.timeSeconds,
  });
};

export const transverseWaveTrace = (
  input: WaveTraceInput,
): KernelResult<readonly WaveTracePoint[]> => {
  const amplitude = validateAmplitude(input.amplitudeMetres);
  if (!amplitude.ok) return amplitude;
  const start = finite(input.startMetres, "startMetres");
  if (!start.ok) return start;
  const end = finite(input.endMetres, "endMetres");
  if (!end.ok) return end;
  const time = nonNegative(input.timeSeconds, "timeSeconds");
  if (!time.ok) return time;
  const count = input.sampleCount ?? 256;
  if (!Number.isInteger(count) || count < 2 || count > maxTraceSamples) {
    return err(
      "precondition-violated",
      `sampleCount must be an integer between 2 and ${maxTraceSamples}; got ${count}`,
    );
  }

  const width = input.endMetres - input.startMetres;
  const validWidth = positive(Math.abs(width), "trace length");
  if (!validWidth.ok) return validWidth;

  const points: WaveTracePoint[] = [];
  for (let index = 0; index < count; index += 1) {
    const x = input.startMetres + (width * index) / (count - 1);
    const sample = transverseWaveAt({
      frequencyHertz: input.frequencyHertz,
      wavelengthMetres: input.wavelengthMetres,
      amplitudeMetres: input.amplitudeMetres,
      positionMetres: metres(x),
      timeSeconds: input.timeSeconds,
      ...(input.phaseRadians !== undefined && { phaseRadians: input.phaseRadians }),
      ...(input.direction !== undefined && { direction: input.direction }),
    });
    if (!sample.ok) return sample;
    points.push(Object.freeze({ ...sample.value, index }));
  }

  return ok(Object.freeze(points));
};

export const superposeAt = (
  input: SuperpositionInput,
): KernelResult<SuperpositionSample> => {
  if (input.components.length === 0) {
    return err("precondition-violated", "components must contain at least one wave");
  }
  const positionAndTime = validatePositionAndTime(input.positionMetres, input.timeSeconds);
  if (!positionAndTime.ok) return positionAndTime;

  let displacement = 0;
  for (const component of input.components) {
    const sample = transverseWaveAt({
      frequencyHertz: component.frequencyHertz,
      wavelengthMetres: component.wavelengthMetres,
      amplitudeMetres: component.amplitudeMetres,
      positionMetres: input.positionMetres,
      timeSeconds: input.timeSeconds,
      ...(component.phaseRadians !== undefined && { phaseRadians: component.phaseRadians }),
      ...(component.direction !== undefined && { direction: component.direction }),
    });
    if (!sample.ok) return sample;
    displacement += sample.value.displacementMetres;
  }

  const validDisplacement = finiteDerived(displacement, "displacement");
  if (!validDisplacement.ok) return validDisplacement;

  return ok({
    displacementMetres: metres(displacement),
    positionMetres: input.positionMetres,
    timeSeconds: input.timeSeconds,
  });
};

export const standingWaveAt = (
  input: StandingWaveInput,
): KernelResult<WaveSample> => {
  const amplitude = validateAmplitude(input.amplitudeMetres);
  if (!amplitude.ok) return amplitude;
  const positionAndTime = validatePositionAndTime(input.positionMetres, input.timeSeconds);
  if (!positionAndTime.ok) return positionAndTime;
  const kinematics = waveKinematics(input);
  if (!kinematics.ok) return kinematics;
  const offset = input.phaseRadians ?? radians(0);
  const offsetValid = finite(offset, "phaseRadians");
  if (!offsetValid.ok) return offsetValid;

  const phase = kinematics.value.angularFrequencyRadiansPerSecond * input.timeSeconds + offset;
  const displacement =
    2 * input.amplitudeMetres * Math.sin(kinematics.value.waveNumberRadiansPerMetre * input.positionMetres) *
    Math.cos(phase);
  const validDisplacement = finiteDerived(displacement, "displacement");
  if (!validDisplacement.ok) return validDisplacement;
  return ok({
    displacementMetres: metres(displacement),
    phaseRadians: radians(phase),
    positionMetres: input.positionMetres,
    timeSeconds: input.timeSeconds,
  });
};

export const beatsAt = (input: BeatInput): KernelResult<WaveSample> => {
  const amplitude = validateAmplitude(input.amplitudeMetres);
  if (!amplitude.ok) return amplitude;
  const carrier = positive(input.carrierFrequencyHertz, "carrierFrequencyHertz");
  if (!carrier.ok) return carrier;
  const beat = positive(input.beatFrequencyHertz, "beatFrequencyHertz");
  if (!beat.ok) return beat;
  const time = nonNegative(input.timeSeconds, "timeSeconds");
  if (!time.ok) return time;
  const offset = input.phaseRadians ?? radians(0);
  const offsetValid = finite(offset, "phaseRadians");
  if (!offsetValid.ok) return offsetValid;

  const envelope = 2 * input.amplitudeMetres * Math.cos(Math.PI * input.beatFrequencyHertz * input.timeSeconds);
  const phase = twoPi * input.carrierFrequencyHertz * input.timeSeconds + offset;
  const displacement = envelope * Math.sin(phase);
  const validDisplacement = finiteDerived(displacement, "displacement");
  if (!validDisplacement.ok) return validDisplacement;

  return ok({
    displacementMetres: metres(displacement),
    phaseRadians: radians(phase),
    positionMetres: metres(0),
    timeSeconds: input.timeSeconds,
  });
};

export const phaseDifference = (
  pathDifferenceMetres: Metres,
  wavelengthMetres: Metres,
): KernelResult<Radians> => {
  const path = finite(pathDifferenceMetres, "pathDifferenceMetres");
  if (!path.ok) return path;
  const wavelength = positive(wavelengthMetres, "wavelengthMetres");
  if (!wavelength.ok) return wavelength;
  const phase = (twoPi * pathDifferenceMetres) / wavelengthMetres;
  const validPhase = finiteDerived(phase, "phaseDifferenceRadians");
  if (!validPhase.ok) return validPhase;
  return ok(radians(phase));
};

export const interferenceIntensity = (
  amplitude1Metres: Metres,
  amplitude2Metres: Metres,
  phaseDifferenceRadians: Radians,
): KernelResult<RelativeIntensity> => {
  const a1 = validateAmplitude(amplitude1Metres);
  if (!a1.ok) return a1;
  const a2 = validateAmplitude(amplitude2Metres);
  if (!a2.ok) return a2;
  const phase = finite(phaseDifferenceRadians, "phaseDifferenceRadians");
  if (!phase.ok) return phase;
  const intensity =
    amplitude1Metres * amplitude1Metres +
    amplitude2Metres * amplitude2Metres +
    2 * amplitude1Metres * amplitude2Metres * Math.cos(phaseDifferenceRadians);
  const validIntensity = finiteDerived(intensity, "intensity");
  if (!validIntensity.ok) return validIntensity;
  return ok(relativeIntensity(Math.max(0, intensity)));
};
