import { approxEqual } from "@paideia/shared";
import { describe, expect, it } from "vitest";
import {
  compareReactionQuotient,
  concentrationMolar,
  equilibriumConstant,
  iceTable,
  quotientFromIceTable,
  reactionQuotient,
  reactionQuotientValue,
  type ConcentrationMolar,
  type EquilibriumConstant,
  type ReactionQuotient,
} from "./index.js";

const c = (value: number): ConcentrationMolar => {
  const result = concentrationMolar(value);
  if (!result.ok) throw new Error(`invalid test concentration ${value}`);
  return result.value;
};

const k = (value: number): EquilibriumConstant => {
  const result = equilibriumConstant(value);
  if (!result.ok) throw new Error(`invalid test equilibrium constant ${value}`);
  return result.value;
};

const q = (value: number): ReactionQuotient => {
  const result = reactionQuotientValue(value);
  if (!result.ok) throw new Error(`invalid test reaction quotient ${value}`);
  return result.value;
};

describe("@paideia/equilibrium", () => {
  it("computes a reaction quotient with coefficients as exponents", () => {
    const result = reactionQuotient({
      products: [{ species: "C", concentration: c(0.2), coefficient: 2 }],
      reactants: [{ species: "A", concentration: c(0.5), coefficient: 1 }],
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBeCloseTo(0.08);
    }
  });

  it("compares Q and K to determine shift direction", () => {
    const towardProducts = compareReactionQuotient({
      reactionQuotient: q(0.4),
      equilibriumConstant: k(2),
    });
    const towardReactants = compareReactionQuotient({
      reactionQuotient: q(4),
      equilibriumConstant: k(2),
    });
    const atEquilibrium = compareReactionQuotient({
      reactionQuotient: q(2.0000000001),
      equilibriumConstant: k(2),
      relativeTolerance: 1e-9,
    });

    expect(towardProducts.ok).toBe(true);
    if (towardProducts.ok) {
      expect(towardProducts.value.direction).toBe("toward-products");
      expect(towardProducts.value.ratio).toBeCloseTo(0.2);
      expect(Object.isFrozen(towardProducts.value)).toBe(true);
    }
    expect(towardReactants.ok).toBe(true);
    if (towardReactants.ok) {
      expect(towardReactants.value.direction).toBe("toward-reactants");
    }
    expect(atEquilibrium.ok).toBe(true);
    if (atEquilibrium.ok) {
      expect(atEquilibrium.value.direction).toBe("at-equilibrium");
    }
  });

  it("builds an immutable ICE table from a simple extent", () => {
    const input = {
      terms: [
        { species: "A", side: "reactant" as const, coefficient: 1, initialConcentration: c(1) },
        { species: "B", side: "product" as const, coefficient: 2, initialConcentration: c(0.1) },
      ],
      extent: c(0.25),
    };
    const before = JSON.stringify(input);

    const result = iceTable(input);

    expect(JSON.stringify(input)).toBe(before);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toHaveLength(2);
      expect(result.value[0]).toMatchObject({
        species: "A",
        side: "reactant",
        coefficient: 1,
        change: -0.25,
      });
      expect(result.value[0]?.equilibriumConcentration).toBeCloseTo(0.75);
      expect(result.value[1]?.change).toBeCloseTo(0.5);
      expect(result.value[1]?.equilibriumConcentration).toBeCloseTo(0.6);
      expect(Object.isFrozen(result.value)).toBe(true);
      expect(Object.isFrozen(result.value[0])).toBe(true);
    }
  });

  it("computes Q from ICE table rows", () => {
    const rows = iceTable({
      terms: [
        { species: "A", side: "reactant", coefficient: 1, initialConcentration: c(1) },
        { species: "B", side: "product", coefficient: 2, initialConcentration: c(0.1) },
      ],
      extent: c(0.25),
    });
    expect(rows.ok).toBe(true);
    if (!rows.ok) return;

    const result = quotientFromIceTable(rows.value);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBeCloseTo((0.6 ** 2) / 0.75);
    }
  });

  it("allows zero product concentration but rejects zero reactant denominator", () => {
    const zeroProduct = reactionQuotient({
      products: [{ species: "B", concentration: c(0), coefficient: 1 }],
      reactants: [{ species: "A", concentration: c(1), coefficient: 1 }],
    });
    expect(zeroProduct.ok).toBe(true);
    if (zeroProduct.ok) expect(zeroProduct.value).toBe(0);

    const zeroReactant = reactionQuotient({
      products: [{ species: "B", concentration: c(1), coefficient: 1 }],
      reactants: [{ species: "A", concentration: c(0), coefficient: 1 }],
    });
    expect(zeroReactant.ok).toBe(false);
    if (!zeroReactant.ok) expect(zeroReactant.error.code).toBe("out-of-domain");
  });

  it("returns out-of-domain for invalid numeric boundaries", () => {
    expect(concentrationMolar(-1).ok).toBe(false);
    expect(equilibriumConstant(0).ok).toBe(false);
    expect(reactionQuotientValue(Number.POSITIVE_INFINITY).ok).toBe(false);

    const invalidTolerance = compareReactionQuotient({
      reactionQuotient: q(1),
      equilibriumConstant: k(1),
      relativeTolerance: -1,
    });
    expect(invalidTolerance.ok).toBe(false);
    if (!invalidTolerance.ok) expect(invalidTolerance.error.code).toBe("out-of-domain");
  });

  it("returns precondition errors for malformed terms", () => {
    const emptyProducts = reactionQuotient({
      products: [],
      reactants: [{ species: "A", concentration: c(1), coefficient: 1 }],
    });
    expect(emptyProducts.ok).toBe(false);
    if (!emptyProducts.ok) expect(emptyProducts.error.code).toBe("precondition-violated");

    const duplicate = reactionQuotient({
      products: [{ species: "A", concentration: c(1), coefficient: 1 }],
      reactants: [{ species: "A", concentration: c(1), coefficient: 1 }],
    });
    expect(duplicate.ok).toBe(false);
    if (!duplicate.ok) expect(duplicate.error.code).toBe("precondition-violated");

    const noProduct = iceTable({
      terms: [
        { species: "A", side: "reactant", coefficient: 1, initialConcentration: c(1) },
        { species: "B", side: "reactant", coefficient: 1, initialConcentration: c(1) },
      ],
      extent: c(0.1),
    });
    expect(noProduct.ok).toBe(false);
    if (!noProduct.ok) expect(noProduct.error.code).toBe("precondition-violated");
  });

  it("rejects ICE extents that would drive a reactant negative", () => {
    const result = iceTable({
      terms: [
        { species: "A", side: "reactant", coefficient: 2, initialConcentration: c(0.1) },
        { species: "B", side: "product", coefficient: 1, initialConcentration: c(0) },
      ],
      extent: c(0.1),
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("out-of-domain");
  });

  it("reports numerical instability for overflowing quotient products", () => {
    const result = reactionQuotient({
      products: [{ species: "B", concentration: c(Number.MAX_VALUE), coefficient: 2 }],
      reactants: [{ species: "A", concentration: c(1), coefficient: 1 }],
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("numerical-instability");
  });

  it("keeps quotient comparison monotone across Q/K ratios", () => {
    const constant = k(10);
    const pairs = [
      { quotient: q(1), direction: "toward-products" },
      { quotient: q(10), direction: "at-equilibrium" },
      { quotient: q(100), direction: "toward-reactants" },
    ] as const;

    for (const pair of pairs) {
      const result = compareReactionQuotient({
        reactionQuotient: pair.quotient,
        equilibriumConstant: constant,
        relativeTolerance: 0,
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.direction).toBe(pair.direction);
        expect(approxEqual(result.value.ratio, pair.quotient / constant, 1e-12)).toBe(true);
      }
    }
  });
});
