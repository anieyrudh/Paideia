import {
  err,
  ok,
  type Brand,
  type KernelResult,
} from "@paideia/shared";

export const semiconductorTolerance = {
  default: 1e-9,
  tight: 1e-12,
  loose: 1e-6,
} as const;

export type Volts = Brand<number, "Volts">;
export type Amps = Brand<number, "Amps">;
export type Ohms = Brand<number, "Ohms">;
export type AmpsPerVoltSquared = Brand<number, "AmpsPerVoltSquared">;
export type PerVolt = Brand<number, "PerVolt">;
export type Siemens = Brand<number, "Siemens">;

export type MosfetRegion = "cutoff" | "triode" | "saturation";

export const roomTemperatureThermalVoltageVolts = 0.02585 as Volts;

export interface DiodeShockleyInput {
  readonly diodeVoltageVolts: Volts;
  readonly saturationCurrentAmps: Amps;
  readonly emissionCoefficient?: number;
  readonly thermalVoltageVolts?: Volts;
}

export interface DiodeVoltageForCurrentInput {
  readonly diodeCurrentAmps: Amps;
  readonly saturationCurrentAmps: Amps;
  readonly emissionCoefficient?: number;
  readonly thermalVoltageVolts?: Volts;
}

export interface DiodeLoadLineInput {
  readonly supplyVoltageVolts: Volts;
  readonly seriesResistanceOhms: Ohms;
  readonly saturationCurrentAmps: Amps;
  readonly emissionCoefficient?: number;
  readonly thermalVoltageVolts?: Volts;
  readonly maxIterations?: number;
}

export interface DiodeLoadLineResult {
  readonly diodeVoltageVolts: Volts;
  readonly diodeCurrentAmps: Amps;
  readonly resistorVoltageVolts: Volts;
  readonly resistorCurrentAmps: Amps;
  readonly iterations: number;
}

export interface NmosSquareLawInput {
  readonly gateSourceVoltageVolts: Volts;
  readonly drainSourceVoltageVolts: Volts;
  readonly thresholdVoltageVolts: Volts;
  readonly transconductanceParameterAmpsPerVoltSquared: AmpsPerVoltSquared;
  readonly channelLengthModulationPerVolt?: PerVolt;
}

export interface NmosSquareLawResult {
  readonly region: MosfetRegion;
  readonly overdriveVoltageVolts: Volts;
  readonly drainCurrentAmps: Amps;
  readonly effectiveTransconductanceSiemens: Siemens;
}

export const volts = (value: number): Volts => value as Volts;
export const amps = (value: number): Amps => value as Amps;
export const ohms = (value: number): Ohms => value as Ohms;
export const ampsPerVoltSquared = (value: number): AmpsPerVoltSquared =>
  value as AmpsPerVoltSquared;
export const perVolt = (value: number): PerVolt => value as PerVolt;

const siemens = (value: number): Siemens => value as Siemens;

const shockleyExponentLimit = 700;
const defaultLoadLineIterations = 80;

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

const diodeScale = (input: {
  readonly emissionCoefficient?: number;
  readonly thermalVoltageVolts?: Volts;
}): KernelResult<number> => {
  const emission = positive(input.emissionCoefficient ?? 1, "emissionCoefficient");
  if (!emission.ok) return emission;
  const thermal = positive(
    input.thermalVoltageVolts ?? roomTemperatureThermalVoltageVolts,
    "thermalVoltageVolts",
  );
  if (!thermal.ok) return thermal;
  return ok((input.emissionCoefficient ?? 1) * (input.thermalVoltageVolts ?? roomTemperatureThermalVoltageVolts));
};

const shockleyCurrentValue = (
  diodeVoltageVolts: Volts,
  saturationCurrentAmps: Amps,
  scaleVolts: number,
): KernelResult<number> => {
  const exponent = diodeVoltageVolts / scaleVolts;
  if (exponent > shockleyExponentLimit) {
    return err(
      "numerical-instability",
      `diode exponent must be <= ${shockleyExponentLimit}; got ${exponent}`,
    );
  }
  const current = saturationCurrentAmps * Math.expm1(exponent);
  const computed = finiteDerived(current, "diodeCurrentAmps");
  if (!computed.ok) return computed;
  return ok(current);
};

export const diodeShockleyCurrent = (input: DiodeShockleyInput): KernelResult<Amps> => {
  const voltage = finite(input.diodeVoltageVolts, "diodeVoltageVolts");
  if (!voltage.ok) return voltage;
  const saturation = positive(input.saturationCurrentAmps, "saturationCurrentAmps");
  if (!saturation.ok) return saturation;
  const scale = diodeScale(input);
  if (!scale.ok) return scale;
  const current = shockleyCurrentValue(
    input.diodeVoltageVolts,
    input.saturationCurrentAmps,
    scale.value,
  );
  return current.ok ? ok(amps(current.value)) : current;
};

export const diodeVoltageForCurrent = (
  input: DiodeVoltageForCurrentInput,
): KernelResult<Volts> => {
  const current = finite(input.diodeCurrentAmps, "diodeCurrentAmps");
  if (!current.ok) return current;
  const saturation = positive(input.saturationCurrentAmps, "saturationCurrentAmps");
  if (!saturation.ok) return saturation;
  if (input.diodeCurrentAmps <= -input.saturationCurrentAmps) {
    return err(
      "out-of-domain",
      "diodeCurrentAmps must be greater than -saturationCurrentAmps",
    );
  }
  const scale = diodeScale(input);
  if (!scale.ok) return scale;
  const voltage = scale.value * Math.log1p(input.diodeCurrentAmps / input.saturationCurrentAmps);
  const computed = finiteDerived(voltage, "diodeVoltageVolts");
  if (!computed.ok) return computed;
  return ok(volts(voltage));
};

export const solveResistiveDiodeLoadLine = (
  input: DiodeLoadLineInput,
): KernelResult<DiodeLoadLineResult> => {
  const supply = nonNegative(input.supplyVoltageVolts, "supplyVoltageVolts");
  if (!supply.ok) return supply;
  const resistance = positive(input.seriesResistanceOhms, "seriesResistanceOhms");
  if (!resistance.ok) return resistance;
  const saturation = positive(input.saturationCurrentAmps, "saturationCurrentAmps");
  if (!saturation.ok) return saturation;
  const scale = diodeScale(input);
  if (!scale.ok) return scale;
  const iterations = input.maxIterations ?? defaultLoadLineIterations;
  if (!Number.isInteger(iterations) || iterations < 8 || iterations > 200) {
    return err("precondition-violated", `maxIterations must be an integer from 8 to 200; got ${iterations}`);
  }
  if (input.supplyVoltageVolts / scale.value > shockleyExponentLimit) {
    return err(
      "numerical-instability",
      "supplyVoltageVolts is too high for the bounded Shockley load-line helper",
    );
  }

  let low = 0;
  let high: number = input.supplyVoltageVolts;
  for (let index = 0; index < iterations; index += 1) {
    const mid = (low + high) / 2;
    const diodeCurrent = shockleyCurrentValue(
      volts(mid),
      input.saturationCurrentAmps,
      scale.value,
    );
    if (!diodeCurrent.ok) return diodeCurrent;
    const resistorCurrent = (input.supplyVoltageVolts - mid) / input.seriesResistanceOhms;
    const residual = diodeCurrent.value - resistorCurrent;
    if (residual > 0) {
      high = mid;
    } else {
      low = mid;
    }
  }

  const diodeVoltage = (low + high) / 2;
  const diodeCurrent = shockleyCurrentValue(
    volts(diodeVoltage),
    input.saturationCurrentAmps,
    scale.value,
  );
  if (!diodeCurrent.ok) return diodeCurrent;
  const resistorVoltage = input.supplyVoltageVolts - diodeVoltage;
  const resistorCurrent = resistorVoltage / input.seriesResistanceOhms;

  for (const [value, label] of [
    [diodeVoltage, "diodeVoltageVolts"],
    [diodeCurrent.value, "diodeCurrentAmps"],
    [resistorVoltage, "resistorVoltageVolts"],
    [resistorCurrent, "resistorCurrentAmps"],
  ] as const) {
    const computed = finiteDerived(value, label);
    if (!computed.ok) return computed;
  }

  return ok(Object.freeze({
    diodeVoltageVolts: volts(diodeVoltage),
    diodeCurrentAmps: amps(diodeCurrent.value),
    resistorVoltageVolts: volts(resistorVoltage),
    resistorCurrentAmps: amps(resistorCurrent),
    iterations,
  }));
};

export const nmosSquareLawOperatingPoint = (
  input: NmosSquareLawInput,
): KernelResult<NmosSquareLawResult> => {
  const gateSource = finite(input.gateSourceVoltageVolts, "gateSourceVoltageVolts");
  if (!gateSource.ok) return gateSource;
  const drainSource = nonNegative(input.drainSourceVoltageVolts, "drainSourceVoltageVolts");
  if (!drainSource.ok) return drainSource;
  const threshold = finite(input.thresholdVoltageVolts, "thresholdVoltageVolts");
  if (!threshold.ok) return threshold;
  const gain = positive(
    input.transconductanceParameterAmpsPerVoltSquared,
    "transconductanceParameterAmpsPerVoltSquared",
  );
  if (!gain.ok) return gain;
  const modulation = nonNegative(
    input.channelLengthModulationPerVolt ?? perVolt(0),
    "channelLengthModulationPerVolt",
  );
  if (!modulation.ok) return modulation;

  const overdrive = input.gateSourceVoltageVolts - input.thresholdVoltageVolts;
  if (overdrive <= 0) {
    return ok(Object.freeze({
      region: "cutoff",
      overdriveVoltageVolts: volts(0),
      drainCurrentAmps: amps(0),
      effectiveTransconductanceSiemens: siemens(0),
    }));
  }

  const modulationFactor =
    1 + (input.channelLengthModulationPerVolt ?? perVolt(0)) * input.drainSourceVoltageVolts;
  const modulationComputed = finiteDerived(modulationFactor, "channelLengthModulationFactor");
  if (!modulationComputed.ok) return modulationComputed;

  const region: MosfetRegion =
    input.drainSourceVoltageVolts < overdrive ? "triode" : "saturation";
  const current =
    region === "triode"
      ? input.transconductanceParameterAmpsPerVoltSquared *
        (overdrive * input.drainSourceVoltageVolts -
          0.5 * input.drainSourceVoltageVolts ** 2) *
        modulationFactor
      : 0.5 *
        input.transconductanceParameterAmpsPerVoltSquared *
        overdrive ** 2 *
        modulationFactor;
  const effectiveTransconductance =
    region === "triode"
      ? input.transconductanceParameterAmpsPerVoltSquared *
        input.drainSourceVoltageVolts *
        modulationFactor
      : input.transconductanceParameterAmpsPerVoltSquared * overdrive * modulationFactor;

  for (const [value, label] of [
    [current, "drainCurrentAmps"],
    [effectiveTransconductance, "effectiveTransconductanceSiemens"],
  ] as const) {
    const computed = finiteDerived(value, label);
    if (!computed.ok) return computed;
  }

  return ok(Object.freeze({
    region,
    overdriveVoltageVolts: volts(overdrive),
    drainCurrentAmps: amps(current),
    effectiveTransconductanceSiemens: siemens(effectiveTransconductance),
  }));
};
