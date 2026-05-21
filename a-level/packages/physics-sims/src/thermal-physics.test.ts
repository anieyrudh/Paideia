// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { approxEqual, kilograms } from "@paideia/shared";
import {
  celsius,
  joulesPerKilogramKelvin,
  litres,
  moles,
  thermalPhysicsModel,
} from "./thermal-physics.js";
import { runThermalPhysicsGateContract } from "./thermal-physics.contract.js";

const gasConstantKpaLitresPerMoleKelvin = 8.314462618;

const stateFor = ({
  volume = 1,
  gasTemperatureCelsius = 27,
  amount = 0.04,
  mass = 0.25,
  initialTemperature = 20,
  finalTemperature = 60,
  specificHeat = 4180,
}: {
  readonly volume?: number;
  readonly gasTemperatureCelsius?: number;
  readonly amount?: number;
  readonly mass?: number;
  readonly initialTemperature?: number;
  readonly finalTemperature?: number;
  readonly specificHeat?: number;
}) => ({
  volumeLitres: litres(volume),
  gasTemperatureCelsius: celsius(gasTemperatureCelsius),
  amountMoles: moles(amount),
  heatingMassKilograms: kilograms(mass),
  initialTemperatureCelsius: celsius(initialTemperature),
  finalTemperatureCelsius: celsius(finalTemperature),
  specificHeatCapacityJoulesPerKilogramKelvin: joulesPerKilogramKelvin(specificHeat),
});

describe("thermal-physics sim", () => {
  it("converts Celsius to kelvin before applying the ideal-gas law", () => {
    const model = thermalPhysicsModel({
      volumeLitres: litres(1),
      gasTemperatureCelsius: celsius(27),
      amountMoles: moles(0.04),
      heatingMassKilograms: kilograms(0.25),
      initialTemperatureCelsius: celsius(20),
      finalTemperatureCelsius: celsius(60),
      specificHeatCapacityJoulesPerKilogramKelvin: joulesPerKilogramKelvin(4180),
    });

    expect(model.ok).toBe(true);
    if (!model.ok) throw new Error(model.error.message);
    expect(approxEqual(model.value.gasTemperatureKelvins, 300.15)).toBe(true);
    expect(approxEqual(model.value.pressureKilopascals, 99.823, 1e-5)).toBe(true);
    expect(approxEqual(model.value.celsiusSubstitutionPressureKilopascals, 8.98, 1e-3)).toBe(true);
    expect(model.value.celsiusTrapPercent).toBeGreaterThan(90);
  });

  it("computes heat transfer with mass, specific heat capacity, and temperature change", () => {
    const model = thermalPhysicsModel({
      volumeLitres: litres(1.2),
      gasTemperatureCelsius: celsius(60),
      amountMoles: moles(0.035),
      heatingMassKilograms: kilograms(0.5),
      initialTemperatureCelsius: celsius(15),
      finalTemperatureCelsius: celsius(45),
      specificHeatCapacityJoulesPerKilogramKelvin: joulesPerKilogramKelvin(4180),
    });

    expect(model.ok).toBe(true);
    if (!model.ok) throw new Error(model.error.message);
    expect(approxEqual(model.value.temperatureChangeKelvins, 30)).toBe(true);
    expect(approxEqual(model.value.thermalEnergyTransferJoules, 62700)).toBe(true);
    expect(model.value.heatingDirection).toBe("heating");
  });

  it("uses numerical regression to show pressure is linear in inverse volume", () => {
    const model = thermalPhysicsModel({
      volumeLitres: litres(2),
      gasTemperatureCelsius: celsius(27),
      amountMoles: moles(0.04),
      heatingMassKilograms: kilograms(0.25),
      initialTemperatureCelsius: celsius(60),
      finalTemperatureCelsius: celsius(20),
      specificHeatCapacityJoulesPerKilogramKelvin: joulesPerKilogramKelvin(4180),
    });

    expect(model.ok).toBe(true);
    if (!model.ok) throw new Error(model.error.message);
    expect(approxEqual(model.value.pressureTrendSlope, 99.823, 1e-5)).toBe(true);
    expect(approxEqual(model.value.pressureTrendR2, 1)).toBe(true);
    expect(model.value.heatingDirection).toBe("cooling");
  });

  it("rejects non-physical volume through the KernelResult error contract", () => {
    const model = thermalPhysicsModel(stateFor({ volume: 0 }));

    expect(model.ok).toBe(false);
    if (!model.ok) expect(model.error.code).toBe("precondition-violated");
  });

  it("property: converts Celsius to kelvin across the valid lab range", () => {
    fc.assert(
      fc.property(fc.integer({ min: -2000, max: 12000 }), (temperatureCenticelsius) => {
        const temperatureCelsius = temperatureCenticelsius / 100;
        const model = thermalPhysicsModel(stateFor({ gasTemperatureCelsius: temperatureCelsius }));

        expect(model.ok).toBe(true);
        if (!model.ok) return;
        expect(
          approxEqual(model.value.gasTemperatureKelvins, temperatureCelsius + 273.15, 1e-10),
        ).toBe(true);
      }),
      { seed: 12401, numRuns: 80 },
    );
  });

  it("property: computes heat transfer as mass times specific heat times temperature change", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 5, max: 120 }),
        fc.integer({ min: 500, max: 5000 }),
        fc.integer({ min: 0, max: 8000 }),
        fc.integer({ min: 0, max: 10000 }),
        (massCentikilograms, specificHeat, initialCenticelsius, finalCenticelsius) => {
          const mass = massCentikilograms / 100;
          const initialTemperature = initialCenticelsius / 100;
          const finalTemperature = finalCenticelsius / 100;
          const deltaTemperature = finalTemperature - initialTemperature;
          const model = thermalPhysicsModel(
            stateFor({
              mass,
              initialTemperature,
              finalTemperature,
              specificHeat,
            }),
          );

          expect(model.ok).toBe(true);
          if (!model.ok) return;
          expect(approxEqual(model.value.temperatureChangeKelvins, deltaTemperature, 1e-10)).toBe(
            true,
          );
          expect(
            approxEqual(
              model.value.thermalEnergyTransferJoules,
              mass * specificHeat * deltaTemperature,
              1e-9,
            ),
          ).toBe(true);
        },
      ),
      { seed: 12402, numRuns: 80 },
    );
  });

  it("property: pressure trend is linear in inverse volume", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 12 }),
        fc.integer({ min: -2000, max: 12000 }),
        (amountCentimoles, temperatureCenticelsius) => {
          const amount = amountCentimoles / 100;
          const gasTemperatureCelsius = temperatureCenticelsius / 100;
          const temperatureKelvins = gasTemperatureCelsius + 273.15;
          const model = thermalPhysicsModel(
            stateFor({
              amount,
              gasTemperatureCelsius,
              volume: 1.5,
            }),
          );

          expect(model.ok).toBe(true);
          if (!model.ok) return;
          expect(
            approxEqual(
              model.value.pressureTrendSlope,
              amount * gasConstantKpaLitresPerMoleKelvin * temperatureKelvins,
              1e-9,
            ),
          ).toBe(true);
          expect(approxEqual(model.value.pressureTrendR2, 1, 1e-9)).toBe(true);
        },
      ),
      { seed: 12403, numRuns: 80 },
    );
  });
});

runThermalPhysicsGateContract();
