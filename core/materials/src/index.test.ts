import fc from "fast-check";
import { describe, expect, it } from "vitest";

import {
  costPerKg,
  densityKgPerCubicMetre,
  embodiedCarbonKgCO2ePerKg,
  pascals,
  performanceIndex,
  rankMaterials,
  safetyFactor,
  strain,
  stressAtStrain,
  validateMaterial,
  yieldStrain,
  type MaterialProperties,
  type Pascals,
  type Strain,
} from "./index.js";

import type { KernelResult } from "@paideia/shared";

const unwrap = <T>(result: KernelResult<T>): T => {
  expect(result.ok).toBe(true);
  if (!result.ok) {
    throw new Error("expected ok result");
  }
  return result.value;
};

const ductileA = (): MaterialProperties => ({
  id: "ductile-a",
  name: "Ductile A",
  class: "metal",
  density: unwrap(densityKgPerCubicMetre(7850)),
  youngModulus: unwrap(pascals(200e9)),
  yieldStrength: unwrap(pascals(250e6)),
  ultimateStrength: unwrap(pascals(450e6)),
  fractureStrain: unwrap(strain(0.2)),
  cost: unwrap(costPerKg(1.2)),
  embodiedCarbon: unwrap(embodiedCarbonKgCO2ePerKg(1.9)),
});

const ductileB = (): MaterialProperties => ({
  id: "ductile-b",
  name: "Ductile B",
  class: "metal",
  density: unwrap(densityKgPerCubicMetre(2700)),
  youngModulus: unwrap(pascals(69e9)),
  yieldStrength: unwrap(pascals(276e6)),
  ultimateStrength: unwrap(pascals(310e6)),
  fractureStrain: unwrap(strain(0.12)),
  cost: unwrap(costPerKg(2.5)),
  embodiedCarbon: unwrap(embodiedCarbonKgCO2ePerKg(8.2)),
});

const brittleA = (): MaterialProperties => ({
  id: "brittle-a",
  name: "Brittle A",
  class: "ceramic",
  density: unwrap(densityKgPerCubicMetre(2500)),
  youngModulus: unwrap(pascals(70e9)),
  ultimateStrength: unwrap(pascals(45e6)),
});

describe("constructors and material validation", () => {
  it("constructs positive unit brands", () => {
    expect(unwrap(pascals(1))).toBe(1);
    expect(unwrap(densityKgPerCubicMetre(1000))).toBe(1000);
    expect(unwrap(costPerKg(2))).toBe(2);
    expect(unwrap(embodiedCarbonKgCO2ePerKg(3))).toBe(3);
    expect(unwrap(strain(0))).toBe(0);
  });

  it("rejects impossible unit values and material records", () => {
    expect(pascals(0).ok).toBe(false);
    expect(densityKgPerCubicMetre(Number.NaN).ok).toBe(false);
    expect(strain(-0.1).ok).toBe(false);

    expect(validateMaterial({ ...ductileA(), id: "" }).ok).toBe(false);
    expect(
      validateMaterial({
        ...ductileA(),
        class: "invalid" as never,
      }).ok,
    ).toBe(false);
    expect(
      validateMaterial({
        ...ductileA(),
        yieldStrength: unwrap(pascals(500e6)),
        ultimateStrength: unwrap(pascals(450e6)),
      }).ok,
    ).toBe(false);
    expect(
      validateMaterial({
        ...ductileA(),
        fractureStrain: unwrap(strain(0.001)),
      }).ok,
    ).toBe(false);
  });
});

describe("stress-strain model", () => {
  it("computes yield strain from strength and modulus", () => {
    expect(unwrap(yieldStrain(ductileA()))).toBeCloseTo(0.00125);
    expect(unwrap(yieldStrain(brittleA()))).toBeNull();
  });

  it("classifies elastic, plastic, and fracture regimes", () => {
    const elastic = unwrap(stressAtStrain(ductileA(), unwrap(strain(0.001))));
    expect(elastic.regime).toBe("elastic");
    expect(elastic.stress).toBeCloseTo(200e6);
    expect(elastic.tangentModulus).toBeCloseTo(200e9);

    const plastic = unwrap(stressAtStrain(ductileA(), unwrap(strain(0.1))));
    expect(plastic.regime).toBe("plastic");
    expect(plastic.stress).toBeGreaterThan(250e6);
    expect(plastic.stress).toBeLessThan(450e6);

    const fracture = unwrap(stressAtStrain(ductileA(), unwrap(strain(0.25))));
    expect(fracture.regime).toBe("fracture");
    expect(fracture.stress).toBeCloseTo(450e6);
  });

  it("treats no-yield materials as brittle elastic until ultimate", () => {
    const elastic = unwrap(stressAtStrain(brittleA(), unwrap(strain(0.0001))));
    expect(elastic.regime).toBe("elastic");

    const fracture = unwrap(stressAtStrain(brittleA(), unwrap(strain(0.002))));
    expect(fracture.regime).toBe("fracture");
  });

  it("honours supplied brittle fracture strain and requires ductile fracture data above yield", () => {
    const brittleWithFracture = {
      ...brittleA(),
      fractureStrain: unwrap(strain(0.01)),
    };
    expect(unwrap(stressAtStrain(brittleWithFracture, unwrap(strain(0.005)))).regime).toBe(
      "elastic",
    );
    expect(unwrap(stressAtStrain(brittleWithFracture, unwrap(strain(0.011)))).regime).toBe(
      "fracture",
    );

    const {
      fractureStrain: _fractureStrain,
      ...noFracture
    } = ductileA();
    expect(stressAtStrain(noFracture, unwrap(strain(0.01))).ok).toBe(false);
  });

  it("has monotonic stress before fracture for valid ductile materials", () => {
    fc.assert(
      fc.property(fc.double({ min: 0, max: 0.199, noNaN: true }), (raw) => {
        const a = unwrap(strain(raw / 2));
        const b = unwrap(strain(raw));
        const pointA = unwrap(stressAtStrain(ductileA(), a));
        const pointB = unwrap(stressAtStrain(ductileA(), b));
        expect(pointB.stress).toBeGreaterThanOrEqual(pointA.stress);
      }),
    );
  });
});

describe("safety factor and performance ranking", () => {
  it("computes yield and ultimate safety factors", () => {
    const yieldMode = unwrap(safetyFactor(ductileA(), unwrap(pascals(125e6))));
    expect(yieldMode.mode).toBe("yield");
    expect(yieldMode.factor).toBeCloseTo(2);
    expect(yieldMode.passes).toBe(true);

    const ultimateMode = unwrap(
      safetyFactor(ductileA(), unwrap(pascals(500e6)), "ultimate"),
    );
    expect(ultimateMode.factor).toBeLessThan(1);
    expect(ultimateMode.passes).toBe(false);
  });

  it("rejects yield safety factor when yield strength is unknown", () => {
    expect(safetyFactor(brittleA(), unwrap(pascals(10e6))).ok).toBe(false);
  });

  it("computes material performance indices and deterministic rankings", () => {
    const specific = unwrap(performanceIndex(ductileB(), "specific-strength"));
    expect(specific.score).toBeCloseTo(276e6 / 2700);
    expect(specific.missing).toEqual([]);

    const missing = unwrap(performanceIndex(brittleA(), "specific-strength"));
    expect(missing.score).toBe(0);
    expect(missing.missing).toEqual(["yieldStrength"]);

    const ranked = unwrap(rankMaterials([ductileA(), ductileB(), brittleA()], "specific-strength"));
    expect(ranked.map((item) => item.material.id)).toEqual([
      "ductile-b",
      "ductile-a",
      "brittle-a",
    ]);
  });

  it("does not mutate caller material arrays while ranking", () => {
    const materials = [ductileA(), ductileB()];
    const ids = materials.map((material) => material.id);
    unwrap(rankMaterials(materials, "specific-stiffness"));
    expect(materials.map((material) => material.id)).toEqual(ids);
  });

  it("rejects unsupported runtime performance goals", () => {
    expect(performanceIndex(ductileA(), "bad" as never).ok).toBe(false);
    expect(rankMaterials([ductileA()], "bad" as never).ok).toBe(false);
  });

  it("uses deterministic ASCII tie-breaks for equal scores", () => {
    const left = { ...ductileA(), id: "B" };
    const right = { ...ductileA(), id: "a" };
    const ranked = unwrap(rankMaterials([right, left], "specific-stiffness"));
    expect(ranked.map((item) => item.material.id)).toEqual(["B", "a"]);
  });

  it("specific stiffness is independent of uniform property scaling", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 1, max: 1e6, noNaN: true }),
        fc.double({ min: 1, max: 1e6, noNaN: true }),
        fc.double({ min: 0.1, max: 10, noNaN: true }),
        (modulus, density, scale) => {
          const base = {
            id: "base",
            name: "Base",
            class: "other" as const,
            density: unwrap(densityKgPerCubicMetre(density)),
            youngModulus: unwrap(pascals(modulus)),
            ultimateStrength: unwrap(pascals(modulus)),
          };
          const scaled = {
            ...base,
            id: "scaled",
            density: unwrap(densityKgPerCubicMetre(density * scale)),
            youngModulus: unwrap(pascals(modulus * scale)),
            ultimateStrength: unwrap(pascals(modulus * scale)),
          };
          expect(unwrap(performanceIndex(base, "specific-stiffness")).score).toBeCloseTo(
            unwrap(performanceIndex(scaled, "specific-stiffness")).score,
          );
        },
      ),
    );
  });
});

describe("runtime precondition guards", () => {
  it("rejects invalid safety-factor modes and invalid stress", () => {
    expect(safetyFactor(ductileA(), -1 as Pascals).ok).toBe(false);
    expect(safetyFactor(ductileA(), unwrap(pascals(1)), "bad" as never).ok).toBe(false);
  });

  it("rejects invalid strain values at runtime", () => {
    expect(stressAtStrain(ductileA(), -1 as Strain).ok).toBe(false);
  });
});
