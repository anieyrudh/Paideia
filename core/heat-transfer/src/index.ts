import {
  err,
  ok,
  watts,
  type Brand,
  type Joules,
  type Kelvins,
  type KernelResult,
  type Metres,
  type Seconds,
  type Watts,
} from "@paideia/shared";

export const heatTransferTolerance = {
  default: 1e-9,
  tight: 1e-12,
  loose: 1e-6,
} as const;

export type SquareMetres = Brand<number, "SquareMetres">;
export type MetresSquaredKelvinsPerWatt = Brand<number, "MetresSquaredKelvinsPerWatt">;
export type WattsPerMetreKelvin = Brand<number, "WattsPerMetreKelvin">;
export type WattsPerSquareMetreKelvin = Brand<number, "WattsPerSquareMetreKelvin">;
export type WattsPerSquareMetre = Brand<number, "WattsPerSquareMetre">;
export type WattsPerSquareMetreKelvinFourth =
  Brand<number, "WattsPerSquareMetreKelvinFourth">;
export type Emissivity = Brand<number, "Emissivity">;
export type SolarHeatGainCoefficient = Brand<number, "SolarHeatGainCoefficient">;
export type ShadedFraction = Brand<number, "ShadedFraction">;

export const stefanBoltzmannConstantWattsPerSquareMetreKelvinFourth =
  5.670374419e-8 as WattsPerSquareMetreKelvinFourth;

export interface ConductionHeatRateInput {
  readonly thermalConductivityWattsPerMetreKelvin: WattsPerMetreKelvin;
  readonly areaSquareMetres: SquareMetres;
  readonly thicknessMetres: Metres;
  readonly hotTemperatureKelvins: Kelvins;
  readonly coldTemperatureKelvins: Kelvins;
}

export interface ConvectionHeatRateInput {
  readonly heatTransferCoefficientWattsPerSquareMetreKelvin: WattsPerSquareMetreKelvin;
  readonly areaSquareMetres: SquareMetres;
  readonly surfaceTemperatureKelvins: Kelvins;
  readonly fluidTemperatureKelvins: Kelvins;
}

export interface RadiationHeatRateInput {
  readonly emissivity: Emissivity;
  readonly areaSquareMetres: SquareMetres;
  readonly hotTemperatureKelvins: Kelvins;
  readonly coldTemperatureKelvins: Kelvins;
}

export interface ThermalResistanceLayer {
  readonly thicknessMetres: Metres;
  readonly thermalConductivityWattsPerMetreKelvin: WattsPerMetreKelvin;
}

export interface ThermalResistanceResult {
  readonly totalResistanceMetresSquaredKelvinsPerWatt: MetresSquaredKelvinsPerWatt;
  readonly layerResistancesMetresSquaredKelvinsPerWatt:
    readonly MetresSquaredKelvinsPerWatt[];
}

export interface UValueInput {
  readonly resistancesMetresSquaredKelvinsPerWatt:
    readonly MetresSquaredKelvinsPerWatt[];
}

export interface SolarHeatGainInput {
  readonly areaSquareMetres: SquareMetres;
  readonly irradianceWattsPerSquareMetre: WattsPerSquareMetre;
  readonly solarHeatGainCoefficient: SolarHeatGainCoefficient;
  readonly exposureFactor: number;
  readonly shadedFraction: ShadedFraction;
}

export interface HeatBalanceInput {
  readonly gainsWatts: readonly Watts[];
  readonly lossesWatts: readonly Watts[];
  readonly durationSeconds?: Seconds;
}

export interface HeatBalanceResult {
  readonly netHeatRateWatts: Watts;
  readonly netEnergyJoules?: Joules;
  readonly direction: "net-gain" | "net-loss" | "balanced";
}

export const squareMetres = (value: number): SquareMetres => value as SquareMetres;
export const metresSquaredKelvinsPerWatt = (value: number): MetresSquaredKelvinsPerWatt =>
  value as MetresSquaredKelvinsPerWatt;
export const wattsPerMetreKelvin = (value: number): WattsPerMetreKelvin =>
  value as WattsPerMetreKelvin;
export const wattsPerSquareMetreKelvin = (value: number): WattsPerSquareMetreKelvin =>
  value as WattsPerSquareMetreKelvin;
export const wattsPerSquareMetre = (value: number): WattsPerSquareMetre =>
  value as WattsPerSquareMetre;
export const wattsPerSquareMetreKelvinFourth = (
  value: number,
): WattsPerSquareMetreKelvinFourth => value as WattsPerSquareMetreKelvinFourth;

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

const unitInterval = <T extends number>(
  value: number,
  label: string,
  brand: (n: number) => T,
): KernelResult<T> => {
  const valid = finite(value, label);
  if (!valid.ok) return valid;
  return value >= 0 && value <= 1
    ? ok(brand(value))
    : err("out-of-domain", `${label} must be in [0, 1]; got ${value}`);
};

export const emissivity = (value: number): KernelResult<Emissivity> =>
  unitInterval(value, "emissivity", (n) => n as Emissivity);

export const solarHeatGainCoefficient = (
  value: number,
): KernelResult<SolarHeatGainCoefficient> =>
  unitInterval(value, "solarHeatGainCoefficient", (n) => n as SolarHeatGainCoefficient);

export const shadedFraction = (value: number): KernelResult<ShadedFraction> =>
  unitInterval(value, "shadedFraction", (n) => n as ShadedFraction);

const signedDelta = (
  hotKelvins: Kelvins,
  coldKelvins: Kelvins,
  hotLabel: string,
  coldLabel: string,
): KernelResult<number> => {
  const hot = nonNegative(hotKelvins, hotLabel);
  if (!hot.ok) return hot;
  const cold = nonNegative(coldKelvins, coldLabel);
  if (!cold.ok) return cold;
  const delta = hotKelvins - coldKelvins;
  const computed = finiteDerived(delta, "temperatureDifferenceKelvins");
  if (!computed.ok) return computed;
  return ok(delta);
};

export const conductionHeatRate = (
  input: ConductionHeatRateInput,
): KernelResult<Watts> => {
  const conductivity = nonNegative(
    input.thermalConductivityWattsPerMetreKelvin,
    "thermalConductivityWattsPerMetreKelvin",
  );
  if (!conductivity.ok) return conductivity;
  const area = nonNegative(input.areaSquareMetres, "areaSquareMetres");
  if (!area.ok) return area;
  const thickness = positive(input.thicknessMetres, "thicknessMetres");
  if (!thickness.ok) return thickness;
  const delta = signedDelta(
    input.hotTemperatureKelvins,
    input.coldTemperatureKelvins,
    "hotTemperatureKelvins",
    "coldTemperatureKelvins",
  );
  if (!delta.ok) return delta;

  const rate =
    (input.thermalConductivityWattsPerMetreKelvin *
      input.areaSquareMetres *
      delta.value) /
    input.thicknessMetres;
  const computed = finiteDerived(rate, "conductionHeatRateWatts");
  if (!computed.ok) return computed;
  return ok(watts(rate));
};

export const convectionHeatRate = (
  input: ConvectionHeatRateInput,
): KernelResult<Watts> => {
  const coefficient = nonNegative(
    input.heatTransferCoefficientWattsPerSquareMetreKelvin,
    "heatTransferCoefficientWattsPerSquareMetreKelvin",
  );
  if (!coefficient.ok) return coefficient;
  const area = nonNegative(input.areaSquareMetres, "areaSquareMetres");
  if (!area.ok) return area;
  const delta = signedDelta(
    input.surfaceTemperatureKelvins,
    input.fluidTemperatureKelvins,
    "surfaceTemperatureKelvins",
    "fluidTemperatureKelvins",
  );
  if (!delta.ok) return delta;

  const rate =
    input.heatTransferCoefficientWattsPerSquareMetreKelvin *
    input.areaSquareMetres *
    delta.value;
  const computed = finiteDerived(rate, "convectionHeatRateWatts");
  if (!computed.ok) return computed;
  return ok(watts(rate));
};

export const radiationHeatRate = (
  input: RadiationHeatRateInput,
): KernelResult<Watts> => {
  const area = nonNegative(input.areaSquareMetres, "areaSquareMetres");
  if (!area.ok) return area;
  const hot = nonNegative(input.hotTemperatureKelvins, "hotTemperatureKelvins");
  if (!hot.ok) return hot;
  const cold = nonNegative(input.coldTemperatureKelvins, "coldTemperatureKelvins");
  if (!cold.ok) return cold;
  const epsilon = emissivity(input.emissivity);
  if (!epsilon.ok) return epsilon;

  const rate =
    input.emissivity *
    stefanBoltzmannConstantWattsPerSquareMetreKelvinFourth *
    input.areaSquareMetres *
    (input.hotTemperatureKelvins ** 4 - input.coldTemperatureKelvins ** 4);
  const computed = finiteDerived(rate, "radiationHeatRateWatts");
  if (!computed.ok) return computed;
  return ok(watts(rate));
};

export const seriesThermalResistance = (
  layers: readonly ThermalResistanceLayer[],
): KernelResult<ThermalResistanceResult> => {
  if (layers.length === 0) {
    return err("precondition-violated", "layers must contain at least one layer");
  }

  const layerResistances: MetresSquaredKelvinsPerWatt[] = [];
  let total = 0;
  for (const [index, layer] of layers.entries()) {
    const thickness = nonNegative(layer.thicknessMetres, `layers[${index}].thicknessMetres`);
    if (!thickness.ok) return thickness;
    const conductivity = positive(
      layer.thermalConductivityWattsPerMetreKelvin,
      `layers[${index}].thermalConductivityWattsPerMetreKelvin`,
    );
    if (!conductivity.ok) return conductivity;
    const resistance = layer.thicknessMetres / layer.thermalConductivityWattsPerMetreKelvin;
    const computed = finiteDerived(
      resistance,
      `layers[${index}].resistanceMetresSquaredKelvinsPerWatt`,
    );
    if (!computed.ok) return computed;
    total += resistance;
    layerResistances.push(metresSquaredKelvinsPerWatt(resistance));
  }

  const computedTotal = finiteDerived(total, "totalResistanceMetresSquaredKelvinsPerWatt");
  if (!computedTotal.ok) return computedTotal;
  return ok({
    totalResistanceMetresSquaredKelvinsPerWatt: metresSquaredKelvinsPerWatt(total),
    layerResistancesMetresSquaredKelvinsPerWatt: Object.freeze([...layerResistances]),
  });
};

export const uValue = (input: UValueInput): KernelResult<WattsPerSquareMetreKelvin> => {
  if (input.resistancesMetresSquaredKelvinsPerWatt.length === 0) {
    return err("precondition-violated", "resistancesMetresSquaredKelvinsPerWatt must not be empty");
  }
  let totalResistance = 0;
  for (const [index, resistance] of input.resistancesMetresSquaredKelvinsPerWatt.entries()) {
    const valid = nonNegative(
      resistance,
      `resistancesMetresSquaredKelvinsPerWatt[${index}]`,
    );
    if (!valid.ok) return valid;
    totalResistance += resistance;
  }
  if (totalResistance <= 0) {
    return err("precondition-violated", "total thermal resistance must be positive");
  }
  const value = 1 / totalResistance;
  const computed = finiteDerived(value, "uValueWattsPerSquareMetreKelvin");
  if (!computed.ok) return computed;
  return ok(wattsPerSquareMetreKelvin(value));
};

export const solarHeatGain = (input: SolarHeatGainInput): KernelResult<Watts> => {
  const area = nonNegative(input.areaSquareMetres, "areaSquareMetres");
  if (!area.ok) return area;
  const irradiance = nonNegative(input.irradianceWattsPerSquareMetre, "irradianceWattsPerSquareMetre");
  if (!irradiance.ok) return irradiance;
  const shgc = solarHeatGainCoefficient(input.solarHeatGainCoefficient);
  if (!shgc.ok) return shgc;
  const exposure = nonNegative(input.exposureFactor, "exposureFactor");
  if (!exposure.ok) return exposure;
  const shaded = shadedFraction(input.shadedFraction);
  if (!shaded.ok) return shaded;

  const gain =
    input.areaSquareMetres *
    input.irradianceWattsPerSquareMetre *
    input.solarHeatGainCoefficient *
    input.exposureFactor *
    (1 - input.shadedFraction);
  const computed = finiteDerived(gain, "solarHeatGainWatts");
  if (!computed.ok) return computed;
  return ok(watts(gain));
};

export const netHeatBalance = (
  input: HeatBalanceInput,
): KernelResult<HeatBalanceResult> => {
  let gains = 0;
  for (const [index, gain] of input.gainsWatts.entries()) {
    const valid = nonNegative(gain, `gainsWatts[${index}]`);
    if (!valid.ok) return valid;
    gains += gain;
  }
  let losses = 0;
  for (const [index, loss] of input.lossesWatts.entries()) {
    const valid = nonNegative(loss, `lossesWatts[${index}]`);
    if (!valid.ok) return valid;
    losses += loss;
  }
  const net = gains - losses;
  const computed = finiteDerived(net, "netHeatRateWatts");
  if (!computed.ok) return computed;

  const result: HeatBalanceResult = {
    netHeatRateWatts: watts(net),
    direction:
      Math.abs(net) <= heatTransferTolerance.default
        ? "balanced"
        : net > 0
          ? "net-gain"
          : "net-loss",
    ...(input.durationSeconds !== undefined
      ? { netEnergyJoules: (net * input.durationSeconds) as Joules }
      : {}),
  };
  if (input.durationSeconds !== undefined) {
    const duration = nonNegative(input.durationSeconds, "durationSeconds");
    if (!duration.ok) return duration;
    const energy = finiteDerived(net * input.durationSeconds, "netEnergyJoules");
    if (!energy.ok) return energy;
  }
  return ok(result);
};
