// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { approxEqual, kilograms } from "@paideia/shared";
import { gravitationalFieldsModel } from "./gravitational-fields.js";
import { runGravitationalFieldsGateContract } from "./gravitational-fields.contract.js";

describe("gravitational-fields sim", () => {
  it("computes field strength, force, potential, and orbit speed through core kernels", () => {
    const model = gravitationalFieldsModel({
      sourceMassEarthMasses: 1,
      radiusEarthRadii: 1,
      testMassKilograms: kilograms(1000),
      comparisonRadiusEarthRadii: 2,
    });

    expect(model.ok).toBe(true);
    if (!model.ok) throw new Error(model.error.message);
    expect(approxEqual(model.value.fieldStrengthNewtonsPerKilogram, 9.819973426224687, 1e-9)).toBe(true);
    expect(approxEqual(model.value.forceNewtons, 9819.973426224687, 1e-9)).toBe(true);
    expect(model.value.potentialJoulesPerKilogram).toBeLessThan(0);
    expect(model.value.potentialEnergyJoules).toBeLessThan(0);
    expect(approxEqual(model.value.orbitSpeedMetresPerSecond, 7909.680821529872, 1e-9)).toBe(true);
  });

  it("makes the field one quarter as large when radius doubles", () => {
    const model = gravitationalFieldsModel({
      sourceMassEarthMasses: 1,
      radiusEarthRadii: 1,
      testMassKilograms: kilograms(1000),
      comparisonRadiusEarthRadii: 2,
    });

    expect(model.ok).toBe(true);
    if (!model.ok) throw new Error(model.error.message);
    expect(approxEqual(model.value.inverseSquareRatio, 0.25)).toBe(true);
    expect(approxEqual(model.value.comparisonFieldStrengthNewtonsPerKilogram, 2.4549933565561717, 1e-9)).toBe(true);
  });

  it("changes force but not field strength when only probe mass changes", () => {
    const lightProbe = gravitationalFieldsModel({
      sourceMassEarthMasses: 1,
      radiusEarthRadii: 2,
      testMassKilograms: kilograms(1000),
      comparisonRadiusEarthRadii: 1,
    });
    const heavyProbe = gravitationalFieldsModel({
      sourceMassEarthMasses: 1,
      radiusEarthRadii: 2,
      testMassKilograms: kilograms(4000),
      comparisonRadiusEarthRadii: 1,
    });

    expect(lightProbe.ok).toBe(true);
    expect(heavyProbe.ok).toBe(true);
    if (!lightProbe.ok || !heavyProbe.ok) return;
    expect(approxEqual(lightProbe.value.fieldStrengthNewtonsPerKilogram, heavyProbe.value.fieldStrengthNewtonsPerKilogram)).toBe(true);
    expect(approxEqual(heavyProbe.value.forceNewtons / lightProbe.value.forceNewtons, 4)).toBe(true);
  });
});

runGravitationalFieldsGateContract();
