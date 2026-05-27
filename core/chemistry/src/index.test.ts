import fc from "fast-check";
import { describe, expect, it } from "vitest";
import type { KernelResult } from "@paideia/shared";

import {
  atmospheres,
  equilibriumQuotient,
  electronConfiguration,
  grams,
  gramsToMoles,
  hendersonHasselbalch,
  kelvins,
  limitingReagent,
  litres,
  molarMass,
  molarMassOf,
  molarity,
  moles,
  molesToGrams,
  nernstPotential,
  parseFormula,
  reactionExtent,
  solveIdealGas,
  strongAcidPH,
  strongBasePH,
  volts,
  type AtomicMassTable,
  type Reaction,
} from "./index.js";

const unwrap = <T>(result: KernelResult<T>): T => {
  expect(result.ok).toBe(true);
  if (!result.ok) {
    throw new Error("expected ok result");
  }
  return result.value;
};

const masses = (): AtomicMassTable => ({
  H: unwrap(molarMass(1.008)),
  O: unwrap(molarMass(15.999)),
  Ca: unwrap(molarMass(40.078)),
  Al: unwrap(molarMass(26.982)),
  S: unwrap(molarMass(32.06)),
  C: unwrap(molarMass(12.011)),
});

const waterReaction = (): Reaction => ({
  reactants: [
    { species: "H2", coefficient: 2 },
    { species: "O2", coefficient: 1 },
  ],
  products: [{ species: "H2O", coefficient: 2 }],
});

describe("unit constructors and formulas", () => {
  it("constructs chemistry units and rejects impossible values", () => {
    expect(unwrap(moles(0))).toBe(0);
    expect(unwrap(grams(0))).toBe(0);
    expect(unwrap(litres(1))).toBe(1);
    expect(unwrap(kelvins(298.15))).toBe(298.15);
    expect(unwrap(atmospheres(1))).toBe(1);
    expect(unwrap(molarity(0.1))).toBe(0.1);
    expect(unwrap(molarMass(18))).toBe(18);
    expect(unwrap(volts(-0.76))).toBe(-0.76);
    expect(litres(0).ok).toBe(false);
    expect(molarity(0).ok).toBe(false);
    expect(volts(Number.NaN).ok).toBe(false);
  });

  it("parses formulas with parentheses", () => {
    expect(unwrap(parseFormula("H2O")).atoms).toEqual({ H: 2, O: 1 });
    expect(unwrap(parseFormula("Ca(OH)2")).atoms).toEqual({
      Ca: 1,
      O: 2,
      H: 2,
    });
    expect(unwrap(parseFormula("Al2(SO4)3")).atoms).toEqual({
      Al: 2,
      S: 3,
      O: 12,
    });
  });

  it("rejects malformed formulas", () => {
    expect(parseFormula("").ok).toBe(false);
    expect(parseFormula(" H2O").ok).toBe(false);
    expect(parseFormula("H2O)").ok).toBe(false);
    expect(parseFormula("(NH4").ok).toBe(false);
    expect(parseFormula("2H").ok).toBe(false);
    expect(parseFormula("H0").ok).toBe(false);
    expect(parseFormula("H01").ok).toBe(false);
    expect(parseFormula("H9007199254740993").ok).toBe(false);
    expect(parseFormula("H()2").ok).toBe(false);
    expect(parseFormula("Hee").ok).toBe(false);
  });

  it("computes molar mass from caller-supplied masses", () => {
    expect(unwrap(molarMassOf("H2O", masses()))).toBeCloseTo(18.015);
    expect(unwrap(molarMassOf("Ca(OH)2", masses()))).toBeCloseTo(74.092);
    expect(molarMassOf("NaCl", masses()).ok).toBe(false);
  });

  it("round-trips grams and moles for positive molar masses", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 1e6, noNaN: true }),
        fc.double({ min: 1e-6, max: 1e6, noNaN: true }),
        (massValue, molarMassValue) => {
          const mass = unwrap(grams(massValue));
          const mm = unwrap(molarMass(molarMassValue));
          const amount = unwrap(gramsToMoles(mass, mm));
          expect(unwrap(molesToGrams(amount, mm))).toBeCloseTo(massValue);
        },
      ),
    );
  });
});

describe("electron configuration", () => {
  it("fills shells and subshells in Aufbau order for first-year elements", () => {
    expect(unwrap(electronConfiguration(6))).toMatchObject({
      notation: "1s2 2s2 2p2",
      valenceElectrons: 4,
      shells: [
        { shell: 1, electrons: 2, capacity: 2 },
        { shell: 2, electrons: 4, capacity: 8 },
      ],
    });
    expect(unwrap(electronConfiguration(11))).toMatchObject({
      notation: "1s2 2s2 2p6 3s1",
      valenceElectrons: 1,
    });
    expect(unwrap(electronConfiguration(17))).toMatchObject({
      notation: "1s2 2s2 2p6 3s2 3p5",
      valenceElectrons: 7,
    });
  });

  it("rejects atomic numbers outside the supported teaching model", () => {
    expect(electronConfiguration(0).ok).toBe(false);
    expect(electronConfiguration(37).ok).toBe(false);
    expect(electronConfiguration(8.5).ok).toBe(false);
  });

  it("preserves shell bookkeeping invariants across the supported domain", () => {
    const seed = 10016;

    fc.assert(
      fc.property(fc.integer({ min: 1, max: 36 }), (atomicNumber) => {
        const result = electronConfiguration(atomicNumber);

        expect(result.ok, `seed=${seed}, atomicNumber=${atomicNumber}`).toBe(true);
        if (!result.ok) {
          throw new Error(`expected electronConfiguration to accept ${atomicNumber}`);
        }

        const shellTotal = result.value.shells.reduce(
          (total, shell) => total + shell.electrons,
          0,
        );

        expect(result.value.notation.length).toBeGreaterThan(0);
        expect(shellTotal).toBe(result.value.totalElectrons);
        expect(result.value.totalElectrons).toBe(atomicNumber);
        expect(result.value.valenceElectrons).toBeGreaterThanOrEqual(0);
        expect(result.value.valenceElectrons).toBeLessThanOrEqual(8);
      }),
      { seed },
    );
  });
});

describe("stoichiometry", () => {
  it("computes reaction extent for any species", () => {
    expect(unwrap(reactionExtent(waterReaction(), "H2", unwrap(moles(4))))).toBe(2);
    expect(unwrap(reactionExtent(waterReaction(), "H2O", unwrap(moles(6))))).toBe(3);
    expect(reactionExtent(waterReaction(), "CO2", unwrap(moles(1))).ok).toBe(false);
  });

  it("computes limiting reagent and leftovers", () => {
    const result = unwrap(
      limitingReagent(waterReaction(), [
        { species: "H2", availableMoles: unwrap(moles(5)) },
        { species: "O2", availableMoles: unwrap(moles(1)) },
      ]),
    );
    expect(result.limitingSpecies).toBe("O2");
    expect(result.reactionExtent).toBe(1);
    expect(result.leftoverReactants.H2).toBe(3);
    expect(result.leftoverReactants.O2).toBe(0);
  });

  it("rejects incomplete or duplicate limiting reagent inputs", () => {
    expect(
      limitingReagent(waterReaction(), [
        { species: "H2", availableMoles: unwrap(moles(5)) },
      ]).ok,
    ).toBe(false);
    expect(
      limitingReagent(waterReaction(), [
        { species: "H2", availableMoles: unwrap(moles(5)) },
        { species: "H2", availableMoles: unwrap(moles(4)) },
        { species: "O2", availableMoles: unwrap(moles(1)) },
      ]).ok,
    ).toBe(false);
    expect(
      limitingReagent(waterReaction(), [
        { species: "H2", availableMoles: unwrap(moles(5)) },
        { species: "O2", availableMoles: unwrap(moles(1)) },
        { species: "H2O", availableMoles: unwrap(moles(0)) },
      ]).ok,
    ).toBe(false);
  });
});

describe("ideal gas and aqueous chemistry", () => {
  it("solves each missing ideal gas field", () => {
    expect(
      unwrap(
        solveIdealGas({
          volumeLitres: unwrap(litres(22.414)),
          moles: unwrap(moles(1)),
          temperatureKelvins: unwrap(kelvins(273.15)),
        }),
      ).pressureAtm,
    ).toBeCloseTo(1, 3);
    expect(
      unwrap(
        solveIdealGas({
          pressureAtm: unwrap(atmospheres(1)),
          volumeLitres: unwrap(litres(22.414)),
          temperatureKelvins: unwrap(kelvins(273.15)),
        }),
      ).moles,
    ).toBeCloseTo(1, 3);
    expect(
      unwrap(
        solveIdealGas({
          pressureAtm: unwrap(atmospheres(1)),
          moles: unwrap(moles(1)),
          temperatureKelvins: unwrap(kelvins(273.15)),
        }),
      ).volumeLitres,
    ).toBeCloseTo(22.414, 3);
    expect(
      unwrap(
        solveIdealGas({
          pressureAtm: unwrap(atmospheres(1)),
          volumeLitres: unwrap(litres(22.414)),
          moles: unwrap(moles(1)),
        }),
      ).temperatureKelvins,
    ).toBeCloseTo(273.15, 2);
  });

  it("rejects ideal gas states with more or fewer than one missing field", () => {
    expect(solveIdealGas({}).ok).toBe(false);
    expect(
      solveIdealGas({
        pressureAtm: unwrap(atmospheres(1)),
        volumeLitres: unwrap(litres(1)),
        moles: unwrap(moles(1)),
        temperatureKelvins: unwrap(kelvins(298)),
      }).ok,
    ).toBe(false);
  });

  it("computes pH helpers under stated assumptions", () => {
    expect(unwrap(strongAcidPH(unwrap(molarity(0.01))))).toBeCloseTo(2);
    expect(unwrap(strongBasePH(unwrap(molarity(0.001))))).toBeCloseTo(11);
    expect(unwrap(strongAcidPH(unwrap(molarity(1e-9))))).toBeCloseTo(6.998, 3);
    expect(unwrap(strongBasePH(unwrap(molarity(1e-9))))).toBeCloseTo(7.002, 3);
    expect(unwrap(hendersonHasselbalch(4.76, unwrap(molarity(0.1)), unwrap(molarity(0.1))))).toBeCloseTo(4.76);
    expect(strongAcidPH(unwrap(molarity(0.1)), 0).ok).toBe(false);
  });

  it("rejects non-finite ideal gas results", () => {
    expect(
      solveIdealGas({
        volumeLitres: unwrap(litres(1)),
        moles: unwrap(moles(1e308)),
        temperatureKelvins: unwrap(kelvins(1e308)),
      }).ok,
    ).toBe(false);
  });
});

describe("equilibrium and electrochemistry", () => {
  it("computes equilibrium quotient with coefficients as exponents", () => {
    const q = unwrap(
      equilibriumQuotient({
        products: [{ species: "C", concentration: unwrap(molarity(0.2)), coefficient: 2 }],
        reactants: [{ species: "A", concentration: unwrap(molarity(0.5)), coefficient: 1 }],
      }),
    );
    expect(q).toBeCloseTo(0.08);
  });

  it("rejects invalid equilibrium terms", () => {
    expect(
      equilibriumQuotient({
        products: [],
        reactants: [{ species: "A", concentration: unwrap(molarity(0.5)), coefficient: 1 }],
      }).ok,
    ).toBe(false);
    expect(
      equilibriumQuotient({
        products: [{ species: "C", concentration: unwrap(molarity(1e200)), coefficient: 2 }],
        reactants: [{ species: "A", concentration: unwrap(molarity(1)), coefficient: 1 }],
      }).ok,
    ).toBe(false);
  });

  it("computes Nernst potentials at 298 K", () => {
    const result = unwrap(
      nernstPotential({
        standardPotentialVolts: unwrap(volts(1.1)),
        electronCount: 2,
        reactionQuotient: 10,
      }),
    );
    expect(result).toBeCloseTo(1.0704, 3);
    expect(
      nernstPotential({
        standardPotentialVolts: unwrap(volts(1.1)),
        electronCount: 0,
        reactionQuotient: 1,
      }).ok,
    ).toBe(false);
    expect(
      nernstPotential({
        standardPotentialVolts: unwrap(volts(1.1)),
        electronCount: 1,
        reactionQuotient: Number.MAX_VALUE,
        temperatureKelvins: unwrap(kelvins(1e308)),
      }).ok,
    ).toBe(false);
  });
});
