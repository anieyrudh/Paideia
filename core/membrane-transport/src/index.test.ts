import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { approxEqual, kelvins as kelvinsBrand } from "@paideia/shared";

import {
  BODY_TEMPERATURE_KELVIN,
  concentration,
  FARADAY_CONSTANT,
  flux,
  GAS_CONSTANT,
  goldmanVoltage,
  ionCharge,
  membraneFlux,
  type MonovalentIon,
  nernstPotential,
  permeability,
  ROOM_TEMPERATURE_KELVIN,
  volts,
  type Concentration,
  type Permeability,
} from "./index.js";

const unwrap = <T>(result: { ok: true; value: T } | { ok: false }): T => {
  if (!result.ok) throw new Error("expected ok result");
  return result.value;
};

const conc = (n: number): Concentration => unwrap(concentration(n));
const perm = (n: number): Permeability => unwrap(permeability(n));

const nernstSeed = 0xc0de01;
const goldmanSeed = 0xc0de02;
const fluxSeed = 0xc0de03;

describe("physical constants", () => {
  it("uses CODATA 2018 gas and Faraday constants", () => {
    expect(GAS_CONSTANT).toBeCloseTo(8.314462618, 9);
    expect(FARADAY_CONSTANT).toBeCloseTo(96485.33212, 5);
  });

  it("body temperature is 37 degC in kelvins", () => {
    expect(BODY_TEMPERATURE_KELVIN).toBeCloseTo(310.15, 6);
  });

  it("room temperature is 25 degC in kelvins", () => {
    expect(ROOM_TEMPERATURE_KELVIN).toBeCloseTo(298.15, 6);
  });
});

describe("constructors", () => {
  it("concentration rejects zero and negative values", () => {
    expect(concentration(0).ok).toBe(false);
    expect(concentration(-5).ok).toBe(false);
    expect(concentration(5).ok).toBe(true);
  });

  it("concentration rejects NaN and Infinity", () => {
    expect(concentration(Number.NaN).ok).toBe(false);
    expect(concentration(Number.POSITIVE_INFINITY).ok).toBe(false);
  });

  it("permeability accepts zero but rejects negatives", () => {
    expect(permeability(0).ok).toBe(true);
    expect(permeability(1e-9).ok).toBe(true);
    expect(permeability(-1e-9).ok).toBe(false);
  });

  it("ionCharge accepts non-zero integers and rejects zero / fractions", () => {
    expect(ionCharge(1).ok).toBe(true);
    expect(ionCharge(-1).ok).toBe(true);
    expect(ionCharge(2).ok).toBe(true);
    expect(ionCharge(0).ok).toBe(false);
    expect(ionCharge(1.5).ok).toBe(false);
  });

  it("volts and flux accept any finite number including zero and negatives", () => {
    expect(volts(0).ok).toBe(true);
    expect(volts(-0.07).ok).toBe(true);
    expect(flux(0).ok).toBe(true);
    expect(flux(-1e-6).ok).toBe(true);
    expect(volts(Number.NaN).ok).toBe(false);
  });
});

describe("nernstPotential", () => {
  it("returns 0 V when inside and outside concentrations are equal", () => {
    const result = nernstPotential({
      temperatureKelvin: BODY_TEMPERATURE_KELVIN,
      charge: unwrap(ionCharge(1)),
      concentrationOutside: conc(140),
      concentrationInside: conc(140),
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value as number).toBeCloseTo(0, 10);
  });

  it("matches the textbook potassium equilibrium near -90 mV at body temperature", () => {
    // Physiological [K+]_out = 4 mM, [K+]_in = 140 mM, z = +1, T = 37 degC.
    const result = nernstPotential({
      temperatureKelvin: BODY_TEMPERATURE_KELVIN,
      charge: unwrap(ionCharge(1)),
      concentrationOutside: conc(4),
      concentrationInside: conc(140),
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      const millivolts = (result.value as number) * 1000;
      // Expected near -94.8 mV; analytic value (310.15 K case).
      expect(millivolts).toBeCloseTo(-94.7, 0);
    }
  });

  it("flips sign when the charge sign flips (chloride example)", () => {
    // [Cl-]_out = 110 mM, [Cl-]_in = 10 mM, z = -1, T = 37 degC.
    const result = nernstPotential({
      temperatureKelvin: BODY_TEMPERATURE_KELVIN,
      charge: unwrap(ionCharge(-1)),
      concentrationOutside: conc(110),
      concentrationInside: conc(10),
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      const millivolts = (result.value as number) * 1000;
      // Same magnitude as +1 case would give, opposite sign.
      expect(millivolts).toBeLessThan(0);
      expect(Math.abs(millivolts)).toBeCloseTo(64.1, 0);
    }
  });

  it("rejects zero or negative temperatures", () => {
    const t = kelvinsBrand(0);
    const result = nernstPotential({
      temperatureKelvin: t,
      charge: unwrap(ionCharge(1)),
      concentrationOutside: conc(4),
      concentrationInside: conc(140),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("out-of-domain");
  });

  it("rejects zero concentration with out-of-domain", () => {
    // Concentration() guards zero — the constructor itself returns err. We cover
    // the guard by manually crafting an unbranded zero and forcing it through
    // (the same path the public constructor blocks).
    const forged = 0 as unknown as Concentration;
    const result = nernstPotential({
      temperatureKelvin: BODY_TEMPERATURE_KELVIN,
      charge: unwrap(ionCharge(1)),
      concentrationOutside: forged,
      concentrationInside: conc(140),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("out-of-domain");
  });

  it("E_+1 = -E_-1 at the same ratio (property)", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.01, max: 1000, noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: 0.01, max: 1000, noNaN: true, noDefaultInfinity: true }),
        (out, ins) => {
          const ePlus = nernstPotential({
            temperatureKelvin: BODY_TEMPERATURE_KELVIN,
            charge: unwrap(ionCharge(1)),
            concentrationOutside: conc(out),
            concentrationInside: conc(ins),
          });
          const eMinus = nernstPotential({
            temperatureKelvin: BODY_TEMPERATURE_KELVIN,
            charge: unwrap(ionCharge(-1)),
            concentrationOutside: conc(out),
            concentrationInside: conc(ins),
          });
          expect(ePlus.ok && eMinus.ok).toBe(true);
          if (ePlus.ok && eMinus.ok) {
            expect(
              approxEqual(ePlus.value as number, -(eMinus.value as number), 1e-12),
            ).toBe(true);
          }
        },
      ),
      { seed: nernstSeed, numRuns: 100 },
    );
  });
});

describe("goldmanVoltage", () => {
  const restingPotassium: MonovalentIon = {
    name: "K",
    charge: 1,
    permeability: perm(1),
    concentrationOutside: conc(4),
    concentrationInside: conc(140),
  };
  const restingSodium: MonovalentIon = {
    name: "Na",
    charge: 1,
    permeability: perm(0.04),
    concentrationOutside: conc(145),
    concentrationInside: conc(12),
  };
  const restingChloride: MonovalentIon = {
    name: "Cl",
    charge: -1,
    permeability: perm(0.45),
    concentrationOutside: conc(110),
    concentrationInside: conc(10),
  };

  it("reproduces the textbook resting potential near -70 mV", () => {
    const result = goldmanVoltage({
      temperatureKelvin: BODY_TEMPERATURE_KELVIN,
      ions: [restingPotassium, restingSodium, restingChloride],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      const millivolts = (result.value as number) * 1000;
      expect(millivolts).toBeGreaterThan(-95);
      expect(millivolts).toBeLessThan(-50);
    }
  });

  it("with K alone, reduces to the Nernst potential for K", () => {
    const ghk = goldmanVoltage({
      temperatureKelvin: BODY_TEMPERATURE_KELVIN,
      ions: [restingPotassium],
    });
    const nernst = nernstPotential({
      temperatureKelvin: BODY_TEMPERATURE_KELVIN,
      charge: unwrap(ionCharge(1)),
      concentrationOutside: conc(4),
      concentrationInside: conc(140),
    });
    expect(ghk.ok && nernst.ok).toBe(true);
    if (ghk.ok && nernst.ok) {
      expect(
        approxEqual(ghk.value as number, nernst.value as number, 1e-12),
      ).toBe(true);
    }
  });

  it("with Cl alone, reduces to the Nernst potential for Cl (with anion convention)", () => {
    const ghk = goldmanVoltage({
      temperatureKelvin: BODY_TEMPERATURE_KELVIN,
      ions: [restingChloride],
    });
    const nernst = nernstPotential({
      temperatureKelvin: BODY_TEMPERATURE_KELVIN,
      charge: unwrap(ionCharge(-1)),
      concentrationOutside: conc(110),
      concentrationInside: conc(10),
    });
    expect(ghk.ok && nernst.ok).toBe(true);
    if (ghk.ok && nernst.ok) {
      expect(
        approxEqual(ghk.value as number, nernst.value as number, 1e-12),
      ).toBe(true);
    }
  });

  it("rejects an empty ion list", () => {
    const result = goldmanVoltage({
      temperatureKelvin: BODY_TEMPERATURE_KELVIN,
      ions: [],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("precondition-violated");
  });

  it("rejects multivalent charges", () => {
    const ca: MonovalentIon = {
      name: "Ca",
      charge: 2 as unknown as 1,
      permeability: perm(0.01),
      concentrationOutside: conc(2),
      concentrationInside: conc(0.0001),
    };
    const result = goldmanVoltage({
      temperatureKelvin: BODY_TEMPERATURE_KELVIN,
      ions: [ca],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("out-of-domain");
  });

  it("rejects the all-zero-permeability case", () => {
    const dead: MonovalentIon = {
      name: "K",
      charge: 1,
      permeability: perm(0),
      concentrationOutside: conc(4),
      concentrationInside: conc(140),
    };
    const result = goldmanVoltage({
      temperatureKelvin: BODY_TEMPERATURE_KELVIN,
      ions: [dead],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("precondition-violated");
  });

  it("is invariant under scaling all permeabilities by a positive constant", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.01, max: 100, noNaN: true, noDefaultInfinity: true }),
        (scale) => {
          const base: ReadonlyArray<MonovalentIon> = [
            restingPotassium,
            restingSodium,
            restingChloride,
          ];
          const scaled = base.map((ion) => ({
            ...ion,
            permeability: perm((ion.permeability as unknown as number) * scale),
          }));
          const a = goldmanVoltage({
            temperatureKelvin: BODY_TEMPERATURE_KELVIN,
            ions: base,
          });
          const b = goldmanVoltage({
            temperatureKelvin: BODY_TEMPERATURE_KELVIN,
            ions: scaled,
          });
          expect(a.ok && b.ok).toBe(true);
          if (a.ok && b.ok) {
            expect(
              approxEqual(a.value as number, b.value as number, 1e-12),
            ).toBe(true);
          }
        },
      ),
      { seed: goldmanSeed, numRuns: 80 },
    );
  });
});

describe("membraneFlux", () => {
  it("returns positive flux when outside concentration is higher", () => {
    const result = membraneFlux({
      permeability: perm(1e-6),
      concentrationOutside: conc(10),
      concentrationInside: conc(1),
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value as number).toBeGreaterThan(0);
  });

  it("returns negative flux when inside concentration is higher", () => {
    const result = membraneFlux({
      permeability: perm(1e-6),
      concentrationOutside: conc(1),
      concentrationInside: conc(10),
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value as number).toBeLessThan(0);
  });

  it("returns zero flux at equilibrium", () => {
    const result = membraneFlux({
      permeability: perm(1e-6),
      concentrationOutside: conc(5),
      concentrationInside: conc(5),
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value as number).toBeCloseTo(0, 12);
  });

  it("scales linearly with permeability (property)", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 1e-12, max: 1, noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: 0.01, max: 1000, noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: 0.01, max: 1000, noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: 0.5, max: 10, noNaN: true, noDefaultInfinity: true }),
        (p, out, ins, factor) => {
          const base = membraneFlux({
            permeability: perm(p),
            concentrationOutside: conc(out),
            concentrationInside: conc(ins),
          });
          const scaled = membraneFlux({
            permeability: perm(p * factor),
            concentrationOutside: conc(out),
            concentrationInside: conc(ins),
          });
          expect(base.ok && scaled.ok).toBe(true);
          if (base.ok && scaled.ok) {
            expect(
              approxEqual(
                (scaled.value as number),
                (base.value as number) * factor,
                1e-10,
              ),
            ).toBe(true);
          }
        },
      ),
      { seed: fluxSeed, numRuns: 100 },
    );
  });

  it("rejects negative permeability", () => {
    // Forge a negative branded permeability to confirm the runtime guard
    // catches a brand-contract violation.
    const result = membraneFlux({
      permeability: -1e-6 as unknown as Permeability,
      concentrationOutside: conc(10),
      concentrationInside: conc(1),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("out-of-domain");
  });
});
