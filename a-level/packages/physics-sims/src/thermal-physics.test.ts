// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { approxEqual, kilograms } from "@paideia/shared";
import {
  celsius,
  joulesPerKilogramKelvin,
  litres,
  moles,
  thermalPhysicsModel,
} from "./thermal-physics.js";
import { runThermalPhysicsGateContract } from "./thermal-physics.contract.js";

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
    const model = thermalPhysicsModel({
      volumeLitres: litres(0),
      gasTemperatureCelsius: celsius(27),
      amountMoles: moles(0.04),
      heatingMassKilograms: kilograms(0.25),
      initialTemperatureCelsius: celsius(20),
      finalTemperatureCelsius: celsius(60),
      specificHeatCapacityJoulesPerKilogramKelvin: joulesPerKilogramKelvin(4180),
    });

    expect(model.ok).toBe(false);
    if (!model.ok) expect(model.error.code).toBe("precondition-violated");
  });
});

runThermalPhysicsGateContract();
