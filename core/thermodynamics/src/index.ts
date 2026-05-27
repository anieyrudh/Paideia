import {
  err,
  joules,
  kelvins,
  ok,
  type Brand,
  type Joules,
  type Kelvins,
  type KernelResult,
  type Kilograms,
} from "@paideia/shared";

export const thermodynamicsTolerance = {
  default: 1e-9,
  tight: 1e-12,
  loose: 1e-6,
} as const;

export type Celsius = Brand<number, "Celsius">;
export type Moles = Brand<number, "Moles">;
export type Pascals = Brand<number, "Pascals">;
export type CubicMetres = Brand<number, "CubicMetres">;
export type JoulesPerKilogramKelvin = Brand<number, "JoulesPerKilogramKelvin">;
export type JoulesPerMoleKelvin = Brand<number, "JoulesPerMoleKelvin">;
export type TemperatureDeltaKelvins = Brand<number, "TemperatureDeltaKelvins">;
export type InverseCubicMetres = Brand<number, "InverseCubicMetres">;
export type ThermalEfficiency = Brand<number, "ThermalEfficiency">;

export const idealGasConstantJoulesPerMoleKelvin =
  8.31446261815324 as JoulesPerMoleKelvin;

export interface IdealGasPressureInput {
  readonly amountMoles: Moles;
  readonly temperatureKelvins: Kelvins;
  readonly volumeCubicMetres: CubicMetres;
}

export interface IdealGasVolumeInput {
  readonly amountMoles: Moles;
  readonly temperatureKelvins: Kelvins;
  readonly pressurePascals: Pascals;
}

export interface IdealGasState extends IdealGasPressureInput {
  readonly pressurePascals: Pascals;
  readonly pressureVolumeProductJoules: Joules;
  readonly amountTemperatureProductJoules: Joules;
}

export interface HeatTransferInput {
  readonly massKilograms: Kilograms;
  readonly specificHeatCapacityJoulesPerKilogramKelvin: JoulesPerKilogramKelvin;
  readonly initialTemperatureKelvins: Kelvins;
  readonly finalTemperatureKelvins: Kelvins;
}

export interface HeatTransferResult {
  readonly temperatureChangeKelvins: TemperatureDeltaKelvins;
  readonly energyTransferJoules: Joules;
  readonly direction: "heating" | "cooling" | "steady";
}

export interface PressureVolumeTraceInput {
  readonly amountMoles: Moles;
  readonly temperatureKelvins: Kelvins;
  readonly minVolumeCubicMetres: CubicMetres;
  readonly maxVolumeCubicMetres: CubicMetres;
  readonly sampleCount?: number;
}

export interface PressureVolumeTracePoint {
  readonly index: number;
  readonly volumeCubicMetres: CubicMetres;
  readonly inverseVolumePerCubicMetre: InverseCubicMetres;
  readonly pressurePascals: Pascals;
}

export interface ThermalEfficiencyInput {
  readonly workOutputJoules: Joules;
  readonly heatInputJoules: Joules;
}

export interface CarnotEfficiencyInput {
  readonly hotReservoirKelvins: Kelvins;
  readonly coldReservoirKelvins: Kelvins;
}

export const celsius = (value: number): Celsius => value as Celsius;
export const moles = (value: number): Moles => value as Moles;
export const pascals = (value: number): Pascals => value as Pascals;
export const cubicMetres = (value: number): CubicMetres => value as CubicMetres;
export const joulesPerKilogramKelvin = (value: number): JoulesPerKilogramKelvin =>
  value as JoulesPerKilogramKelvin;
export const joulesPerMoleKelvin = (value: number): JoulesPerMoleKelvin =>
  value as JoulesPerMoleKelvin;
export const temperatureDeltaKelvins = (value: number): TemperatureDeltaKelvins =>
  value as TemperatureDeltaKelvins;
export const inverseCubicMetres = (value: number): InverseCubicMetres =>
  value as InverseCubicMetres;

const maxTraceSamples = 20_001;
const celsiusKelvinOffset = 273.15;

const finite = (value: number, label: string): KernelResult<void> =>
  Number.isFinite(value)
    ? ok(undefined)
    : err("precondition-violated", `${label} must be finite; got ${value}`);

const finiteDerived = (value: number, label: string): KernelResult<void> =>
  Number.isFinite(value)
    ? ok(undefined)
    : err("numerical-instability", `${label} must be finite after computation; got ${value}`);

const nonNegative = (value: number, label: string): KernelResult<void> => {
  const valid = finite(value, label);
  if (!valid.ok) return valid;
  return value >= 0
    ? ok(undefined)
    : err("precondition-violated", `${label} must be non-negative; got ${value}`);
};

const positive = (value: number, label: string): KernelResult<void> => {
  const valid = finite(value, label);
  if (!valid.ok) return valid;
  return value > 0
    ? ok(undefined)
    : err("precondition-violated", `${label} must be positive; got ${value}`);
};

export const thermalEfficiency = (
  value: number,
): KernelResult<ThermalEfficiency> => {
  const valid = finite(value, "thermalEfficiency");
  if (!valid.ok) return valid;
  return value >= 0 && value <= 1
    ? ok(value as ThermalEfficiency)
    : err("out-of-domain", `thermalEfficiency must be in [0, 1]; got ${value}`);
};

export const kelvinFromCelsius = (
  temperatureCelsius: Celsius,
): KernelResult<Kelvins> => {
  const temperature = finite(temperatureCelsius, "temperatureCelsius");
  if (!temperature.ok) return temperature;
  const value = temperatureCelsius + celsiusKelvinOffset;
  const computed = finiteDerived(value, "temperatureKelvins");
  if (!computed.ok) return computed;
  return value >= 0
    ? ok(kelvins(value))
    : err("out-of-domain", `temperatureKelvins must be non-negative; got ${value}`);
};

export const celsiusFromKelvin = (
  temperatureKelvins: Kelvins,
): KernelResult<Celsius> => {
  const temperature = nonNegative(temperatureKelvins, "temperatureKelvins");
  if (!temperature.ok) return temperature;
  return ok(celsius(temperatureKelvins - celsiusKelvinOffset));
};

export const idealGasPressure = (
  input: IdealGasPressureInput,
): KernelResult<Pascals> => {
  const amount = positive(input.amountMoles, "amountMoles");
  if (!amount.ok) return amount;
  const temperature = positive(input.temperatureKelvins, "temperatureKelvins");
  if (!temperature.ok) return temperature;
  const volume = positive(input.volumeCubicMetres, "volumeCubicMetres");
  if (!volume.ok) return volume;

  const pressure =
    (input.amountMoles *
      idealGasConstantJoulesPerMoleKelvin *
      input.temperatureKelvins) /
    input.volumeCubicMetres;
  const computed = finiteDerived(pressure, "pressurePascals");
  if (!computed.ok) return computed;
  return ok(pascals(pressure));
};

export const idealGasVolume = (
  input: IdealGasVolumeInput,
): KernelResult<CubicMetres> => {
  const amount = positive(input.amountMoles, "amountMoles");
  if (!amount.ok) return amount;
  const temperature = positive(input.temperatureKelvins, "temperatureKelvins");
  if (!temperature.ok) return temperature;
  const pressure = positive(input.pressurePascals, "pressurePascals");
  if (!pressure.ok) return pressure;

  const volume =
    (input.amountMoles *
      idealGasConstantJoulesPerMoleKelvin *
      input.temperatureKelvins) /
    input.pressurePascals;
  const computed = finiteDerived(volume, "volumeCubicMetres");
  if (!computed.ok) return computed;
  return ok(cubicMetres(volume));
};

export const idealGasState = (
  input: IdealGasPressureInput,
): KernelResult<IdealGasState> => {
  const pressure = idealGasPressure(input);
  if (!pressure.ok) return pressure;
  const pv = pressure.value * input.volumeCubicMetres;
  const nrt =
    input.amountMoles *
    idealGasConstantJoulesPerMoleKelvin *
    input.temperatureKelvins;

  for (const [label, value] of [
    ["pressureVolumeProductJoules", pv],
    ["amountTemperatureProductJoules", nrt],
  ] as const) {
    const computed = finiteDerived(value, label);
    if (!computed.ok) return computed;
  }

  return ok({
    amountMoles: input.amountMoles,
    temperatureKelvins: input.temperatureKelvins,
    volumeCubicMetres: input.volumeCubicMetres,
    pressurePascals: pressure.value,
    pressureVolumeProductJoules: joules(pv),
    amountTemperatureProductJoules: joules(nrt),
  });
};

export const heatTransfer = (
  input: HeatTransferInput,
): KernelResult<HeatTransferResult> => {
  const mass = nonNegative(input.massKilograms, "massKilograms");
  if (!mass.ok) return mass;
  const capacity = positive(
    input.specificHeatCapacityJoulesPerKilogramKelvin,
    "specificHeatCapacityJoulesPerKilogramKelvin",
  );
  if (!capacity.ok) return capacity;
  const initial = nonNegative(input.initialTemperatureKelvins, "initialTemperatureKelvins");
  if (!initial.ok) return initial;
  const final = nonNegative(input.finalTemperatureKelvins, "finalTemperatureKelvins");
  if (!final.ok) return final;

  const delta = input.finalTemperatureKelvins - input.initialTemperatureKelvins;
  const energy =
    input.massKilograms *
    input.specificHeatCapacityJoulesPerKilogramKelvin *
    delta;
  const computed = finiteDerived(energy, "energyTransferJoules");
  if (!computed.ok) return computed;
  const direction =
    Math.abs(energy) <= thermodynamicsTolerance.default
      ? "steady"
      : energy > 0
        ? "heating"
        : "cooling";

  return ok({
    temperatureChangeKelvins: temperatureDeltaKelvins(delta),
    energyTransferJoules: joules(energy),
    direction,
  });
};

export const pressureVolumeTrace = (
  input: PressureVolumeTraceInput,
): KernelResult<readonly PressureVolumeTracePoint[]> => {
  const minVolume = positive(input.minVolumeCubicMetres, "minVolumeCubicMetres");
  if (!minVolume.ok) return minVolume;
  const maxVolume = positive(input.maxVolumeCubicMetres, "maxVolumeCubicMetres");
  if (!maxVolume.ok) return maxVolume;
  if (input.maxVolumeCubicMetres <= input.minVolumeCubicMetres) {
    return err(
      "precondition-violated",
      "maxVolumeCubicMetres must be greater than minVolumeCubicMetres",
    );
  }
  const count = input.sampleCount ?? 128;
  if (!Number.isInteger(count) || count < 2 || count > maxTraceSamples) {
    return err(
      "precondition-violated",
      `sampleCount must be an integer between 2 and ${maxTraceSamples}; got ${count}`,
    );
  }

  const width = input.maxVolumeCubicMetres - input.minVolumeCubicMetres;
  const points: PressureVolumeTracePoint[] = [];
  for (let index = 0; index < count; index += 1) {
    const volume = input.minVolumeCubicMetres + (width * index) / (count - 1);
    const pressure = idealGasPressure({
      amountMoles: input.amountMoles,
      temperatureKelvins: input.temperatureKelvins,
      volumeCubicMetres: cubicMetres(volume),
    });
    if (!pressure.ok) return pressure;
    points.push(Object.freeze({
      index,
      volumeCubicMetres: cubicMetres(volume),
      inverseVolumePerCubicMetre: inverseCubicMetres(1 / volume),
      pressurePascals: pressure.value,
    }));
  }

  return ok(Object.freeze(points));
};

export const engineEfficiency = (
  input: ThermalEfficiencyInput,
): KernelResult<ThermalEfficiency> => {
  const work = nonNegative(input.workOutputJoules, "workOutputJoules");
  if (!work.ok) return work;
  const heat = positive(input.heatInputJoules, "heatInputJoules");
  if (!heat.ok) return heat;
  const value = input.workOutputJoules / input.heatInputJoules;
  const computed = finiteDerived(value, "thermalEfficiency");
  if (!computed.ok) return computed;
  return thermalEfficiency(value);
};

export const carnotEfficiency = (
  input: CarnotEfficiencyInput,
): KernelResult<ThermalEfficiency> => {
  const hot = positive(input.hotReservoirKelvins, "hotReservoirKelvins");
  if (!hot.ok) return hot;
  const cold = nonNegative(input.coldReservoirKelvins, "coldReservoirKelvins");
  if (!cold.ok) return cold;
  if (input.coldReservoirKelvins >= input.hotReservoirKelvins) {
    return err(
      "precondition-violated",
      "coldReservoirKelvins must be lower than hotReservoirKelvins",
    );
  }
  const value = 1 - input.coldReservoirKelvins / input.hotReservoirKelvins;
  const computed = finiteDerived(value, "thermalEfficiency");
  if (!computed.ok) return computed;
  return thermalEfficiency(value);
};
