import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { joules, kelvins, kilograms } from "@paideia/shared";
import {
  carnotEfficiency,
  celsius,
  celsiusFromKelvin,
  cubicMetres,
  engineEfficiency,
  heatTransfer,
  idealGasPressure,
  idealGasState,
  idealGasVolume,
  joulesPerKilogramKelvin,
  kelvinFromCelsius,
  moles,
  pascals,
  pressureVolumeTrace,
  thermalEfficiency,
  thermodynamicsTolerance,
} from "./index.js";

const expectOk = <T>(
  result: { readonly ok: true; readonly value: T } | { readonly ok: false },
): T => {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error("Expected KernelResult.ok");
  return result.value;
};

const expectErrCode = (
  result:
    | { readonly ok: true }
    | { readonly ok: false; readonly error: { readonly code: string } },
  code: string,
) => {
  expect(result.ok).toBe(false);
  if (result.ok) throw new Error("Expected KernelResult.err");
  expect(result.error.code).toBe(code);
};

describe("@paideia/thermodynamics temperature conversion", () => {
  it("converts Celsius to kelvin and back", () => {
    const kelvin = expectOk(kelvinFromCelsius(celsius(27)));
    expect(kelvin).toBeCloseTo(300.15, 12);
    expect(expectOk(celsiusFromKelvin(kelvin))).toBeCloseTo(27, 12);
  });

  it("rejects temperatures below absolute zero", () => {
    expectErrCode(kelvinFromCelsius(celsius(-274)), "out-of-domain");
    expectErrCode(celsiusFromKelvin(kelvins(-1)), "precondition-violated");
  });
});

describe("@paideia/thermodynamics ideal gas", () => {
  it("computes pressure, volume, and state products using pV = nRT", () => {
    const pressure = expectOk(
      idealGasPressure({
        amountMoles: moles(1),
        temperatureKelvins: kelvins(300),
        volumeCubicMetres: cubicMetres(0.024),
      }),
    );
    expect(pressure).toBeCloseTo(103930.7827269155, 9);

    const volume = expectOk(
      idealGasVolume({
        amountMoles: moles(1),
        temperatureKelvins: kelvins(300),
        pressurePascals: pressure,
      }),
    );
    expect(volume).toBeCloseTo(0.024, 12);

    const state = expectOk(
      idealGasState({
        amountMoles: moles(1),
        temperatureKelvins: kelvins(300),
        volumeCubicMetres: cubicMetres(0.024),
      }),
    );
    expect(state.pressureVolumeProductJoules).toBeCloseTo(
      state.amountTemperatureProductJoules,
      9,
    );
  });

  it("rejects non-positive state values", () => {
    expectErrCode(
      idealGasPressure({
        amountMoles: moles(0),
        temperatureKelvins: kelvins(300),
        volumeCubicMetres: cubicMetres(1),
      }),
      "precondition-violated",
    );
    expectErrCode(
      idealGasVolume({
        amountMoles: moles(1),
        temperatureKelvins: kelvins(300),
        pressurePascals: pascals(Number.NaN),
      }),
      "precondition-violated",
    );
  });

  it("rejects non-finite derived gas calculations", () => {
    expectErrCode(
      idealGasPressure({
        amountMoles: moles(Number.MAX_VALUE),
        temperatureKelvins: kelvins(Number.MAX_VALUE),
        volumeCubicMetres: cubicMetres(Number.MIN_VALUE),
      }),
      "numerical-instability",
    );
  });

  it("keeps pV constant across a fixed-temperature trace", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.01, max: 10, noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: 1, max: 1000, noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: 0.001, max: 0.1, noNaN: true, noDefaultInfinity: true }),
        (amount, temperature, minVolume) => {
          const maxVolume = minVolume * 4;
          const trace = expectOk(
            pressureVolumeTrace({
              amountMoles: moles(amount),
              temperatureKelvins: kelvins(temperature),
              minVolumeCubicMetres: cubicMetres(minVolume),
              maxVolumeCubicMetres: cubicMetres(maxVolume),
              sampleCount: 12,
            }),
          );
          const firstProduct =
            (trace[0]?.pressurePascals ?? 0) *
            (trace[0]?.volumeCubicMetres ?? 0);
          for (const point of trace) {
            expect(point.pressurePascals * point.volumeCubicMetres).toBeCloseTo(
              firstProduct,
              Math.ceil(-Math.log10(thermodynamicsTolerance.loose)),
            );
          }
        },
      ),
    );
  });

  it("rejects invalid trace ranges and sample counts", () => {
    expectErrCode(
      pressureVolumeTrace({
        amountMoles: moles(1),
        temperatureKelvins: kelvins(300),
        minVolumeCubicMetres: cubicMetres(2),
        maxVolumeCubicMetres: cubicMetres(1),
      }),
      "precondition-violated",
    );
    expectErrCode(
      pressureVolumeTrace({
        amountMoles: moles(1),
        temperatureKelvins: kelvins(300),
        minVolumeCubicMetres: cubicMetres(1),
        maxVolumeCubicMetres: cubicMetres(2),
        sampleCount: 1,
      }),
      "precondition-violated",
    );
  });
});

describe("@paideia/thermodynamics heat transfer", () => {
  it("computes Q = mc Delta T with direction", () => {
    const heating = expectOk(
      heatTransfer({
        massKilograms: kilograms(0.25),
        specificHeatCapacityJoulesPerKilogramKelvin: joulesPerKilogramKelvin(4180),
        initialTemperatureKelvins: kelvins(293.15),
        finalTemperatureKelvins: kelvins(333.15),
      }),
    );
    expect(heating.temperatureChangeKelvins).toBeCloseTo(40, 12);
    expect(heating.energyTransferJoules).toBeCloseTo(41800, 9);
    expect(heating.direction).toBe("heating");

    const cooling = expectOk(
      heatTransfer({
        massKilograms: kilograms(0.25),
        specificHeatCapacityJoulesPerKilogramKelvin: joulesPerKilogramKelvin(4180),
        initialTemperatureKelvins: kelvins(333.15),
        finalTemperatureKelvins: kelvins(293.15),
      }),
    );
    expect(cooling.energyTransferJoules).toBeCloseTo(-41800, 9);
    expect(cooling.direction).toBe("cooling");
  });

  it("rejects invalid heat-transfer inputs", () => {
    expectErrCode(
      heatTransfer({
        massKilograms: kilograms(-1),
        specificHeatCapacityJoulesPerKilogramKelvin: joulesPerKilogramKelvin(4180),
        initialTemperatureKelvins: kelvins(300),
        finalTemperatureKelvins: kelvins(310),
      }),
      "precondition-violated",
    );
  });
});

describe("@paideia/thermodynamics efficiency", () => {
  it("computes engine and Carnot efficiency within [0, 1]", () => {
    expect(expectOk(engineEfficiency({
      workOutputJoules: joules(200),
      heatInputJoules: joules(500),
    }))).toBeCloseTo(0.4, 12);

    expect(expectOk(carnotEfficiency({
      hotReservoirKelvins: kelvins(500),
      coldReservoirKelvins: kelvins(300),
    }))).toBeCloseTo(0.4, 12);
  });

  it("rejects impossible efficiencies", () => {
    expectErrCode(thermalEfficiency(1.2), "out-of-domain");
    expectErrCode(
      engineEfficiency({
        workOutputJoules: joules(600),
        heatInputJoules: joules(500),
      }),
      "out-of-domain",
    );
    expectErrCode(
      carnotEfficiency({
        hotReservoirKelvins: kelvins(300),
        coldReservoirKelvins: kelvins(300),
      }),
      "precondition-violated",
    );
  });
});
