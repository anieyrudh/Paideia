import fc from "fast-check";
import { describe, expect, it } from "vitest";

import {
  adjacencyList,
  atomicMass,
  bondOrderTotal,
  elementSymbol,
  layoutMolecule2D,
  molecularFormula,
  molecularMass,
  moleculeAtomId,
  validateMolecule,
  validateValence,
  type ElementSymbol,
  type MoleculeAtomId,
  type MoleculeGraph,
} from "./index.js";

const atomId = (value: string): MoleculeAtomId => {
  const result = moleculeAtomId(value);
  if (!result.ok) throw new Error(result.error.message);
  return result.value;
};

const element = (value: string): ElementSymbol => {
  const result = elementSymbol(value);
  if (!result.ok) throw new Error(result.error.message);
  return result.value;
};

const mass = (value: number) => {
  const result = atomicMass(value);
  if (!result.ok) throw new Error(result.error.message);
  return result.value;
};

const water: MoleculeGraph = {
  atoms: [
    { id: atomId("O1"), element: element("O") },
    { id: atomId("H1"), element: element("H") },
    { id: atomId("H2"), element: element("H") },
  ],
  bonds: [
    { from: atomId("O1"), to: atomId("H1"), order: 1 },
    { from: atomId("O1"), to: atomId("H2"), order: 1 },
  ],
};

describe("moleculeAtomId and elementSymbol", () => {
  it("brands valid identifiers, element symbols, and atomic masses", () => {
    expect(moleculeAtomId("C1").ok).toBe(true);
    expect(moleculeAtomId("").ok).toBe(false);
    expect(moleculeAtomId("C 1").ok).toBe(false);
    expect(moleculeAtomId("__proto__").ok).toBe(false);

    expect(elementSymbol("C").ok).toBe(true);
    expect(elementSymbol("Cl").ok).toBe(true);
    expect(elementSymbol("cl").ok).toBe(false);
    expect(elementSymbol("Carbon").ok).toBe(false);

    expect(atomicMass(12.011).ok).toBe(true);
    expect(atomicMass(0).ok).toBe(false);
    expect(atomicMass(Number.NaN).ok).toBe(false);
  });
});

describe("validateMolecule", () => {
  it("accepts valid graphs without mutating them", () => {
    const before = JSON.stringify(water);
    const result = validateMolecule(water);

    expect(result).toEqual({ ok: true, value: water });
    expect(JSON.stringify(water)).toBe(before);
  });

  it("rejects duplicate atoms, malformed atoms, bad bonds, and duplicate bonds", () => {
    expect(validateMolecule({ ...water, atoms: [water.atoms[0]!, water.atoms[0]!] }).ok).toBe(false);
    expect(validateMolecule({ ...water, atoms: [{ ...water.atoms[0]!, charge: 0.5 }] }).ok).toBe(false);
    expect(validateMolecule({
      atoms: water.atoms,
      bonds: [{ from: atomId("O1"), to: atomId("missing"), order: 1 }],
    }).ok).toBe(false);
    expect(validateMolecule({
      atoms: water.atoms,
      bonds: [{ from: atomId("O1"), to: atomId("O1"), order: 1 }],
    }).ok).toBe(false);
    expect(validateMolecule({
      atoms: water.atoms,
      bonds: [
        { from: atomId("O1"), to: atomId("H1"), order: 1 },
        { from: atomId("H1"), to: atomId("O1"), order: 1 },
      ],
    }).ok).toBe(false);
  });
});

describe("molecularFormula and molecularMass", () => {
  it("uses Hill order for carbon molecules and alphabetical order otherwise", () => {
    const glucose = molecularFormula({
      atoms: [
        ...Array.from({ length: 6 }, (_, index) => ({ id: atomId(`C${index}`), element: element("C") })),
        ...Array.from({ length: 12 }, (_, index) => ({ id: atomId(`H${index}`), element: element("H") })),
        ...Array.from({ length: 6 }, (_, index) => ({ id: atomId(`O${index}`), element: element("O") })),
      ],
      bonds: [],
    });
    const salt = molecularFormula({
      atoms: [
        { id: atomId("Na1"), element: element("Na") },
        { id: atomId("Cl1"), element: element("Cl") },
      ],
      bonds: [],
    });

    expect(glucose.ok && glucose.value.hill).toBe("C6H12O6");
    expect(salt.ok && salt.value.hill).toBe("ClNa");
  });

  it("computes mass from caller supplied atomic masses and rejects missing masses", () => {
    expect(molecularMass(water, { H: mass(1.008), O: mass(15.999) })).toEqual({
      ok: true,
      value: 18.015,
    });
    expect(molecularMass(water, { H: mass(1.008) }).ok).toBe(false);
    expect(molecularMass(water, { H: mass(1.008), O: 0 as ReturnType<typeof mass> }).ok).toBe(false);

    const inheritedMasses = Object.create({ H: mass(1.008), O: mass(15.999) }) as Record<string, ReturnType<typeof mass>>;
    expect(molecularMass(water, inheritedMasses).ok).toBe(false);
  });

  it("property: formula counts preserve atom count", () => {
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom("C", "H", "O", "N"), { minLength: 1, maxLength: 30 }),
        (symbols) => {
          const molecule: MoleculeGraph = {
            atoms: symbols.map((symbol, index) => ({
              id: atomId(`A${index}`),
              element: element(symbol),
            })),
            bonds: [],
          };
          const formula = molecularFormula(molecule);
          expect(formula.ok).toBe(true);
          if (!formula.ok) return;
          const total = Object.values(formula.value.counts).reduce((sum, count) => sum + count, 0);
          expect(total).toBe(symbols.length);
        },
      ),
    );
  });
});

describe("adjacency, bond order, and valence", () => {
  it("builds undirected adjacency and bond-order totals", () => {
    const adjacency = adjacencyList(water);
    expect(adjacency.ok).toBe(true);
    if (!adjacency.ok) return;
    expect(adjacency.value.O1?.length).toBe(2);
    expect(bondOrderTotal(water, atomId("O1"))).toEqual({ ok: true, value: 2 });
    expect(bondOrderTotal(water, atomId("missing")).ok).toBe(false);

    const benzeneEdge: MoleculeGraph = {
      atoms: [
        { id: atomId("C1"), element: element("C") },
        { id: atomId("C2"), element: element("C") },
      ],
      bonds: [{ from: atomId("C1"), to: atomId("C2"), order: "aromatic" }],
    };
    expect(bondOrderTotal(benzeneEdge, atomId("C1"))).toEqual({ ok: true, value: 1.5 });
  });

  it("reports valence issues from caller-supplied limits", () => {
    expect(validateValence(water, { H: 1, O: 2 })).toEqual({ ok: true, value: [] });
    const overBonded = validateValence(water, { H: 1, O: 1 });
    expect(overBonded.ok).toBe(true);
    if (!overBonded.ok) return;
    expect(overBonded.value).toEqual([
      { atomId: atomId("O1"), element: element("O"), observedBondOrder: 2, maxAllowed: 1 },
    ]);
    expect(validateValence(water, { H: 1 }).ok).toBe(false);

    const inheritedLimits = Object.create({ H: 1, O: 2 }) as Record<string, number>;
    expect(validateValence(water, inheritedLimits).ok).toBe(false);
  });
});

describe("layoutMolecule2D", () => {
  it("keeps supplied 2D positions and generates deterministic positions for missing ones", () => {
    const withPosition: MoleculeGraph = {
      atoms: [
        { id: atomId("A"), element: element("C"), position2d: { x: 5, y: 6 } },
        { id: atomId("B"), element: element("O") },
      ],
      bonds: [{ from: atomId("A"), to: atomId("B"), order: 2 }],
    };

    const first = layoutMolecule2D(withPosition, { radius: 10, centerX: 0, centerY: 0 });
    const second = layoutMolecule2D(withPosition, { radius: 10, centerX: 0, centerY: 0 });

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    if (!first.ok || !second.ok) return;
    expect(first.value.positions.A).toEqual({ x: 5, y: 6 });
    expect(first.value).toEqual(second.value);
  });

  it("rejects invalid layout options and invalid positions", () => {
    expect(layoutMolecule2D(water, { radius: -1 }).ok).toBe(false);
    expect(validateMolecule({
      atoms: [{ id: atomId("A"), element: element("C"), position2d: { x: Number.NaN, y: 0 } }],
      bonds: [],
    }).ok).toBe(false);
  });

  it("property: generated layout contains one finite position per atom", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 20 }), (count) => {
        const molecule: MoleculeGraph = {
          atoms: Array.from({ length: count }, (_, index) => ({
            id: atomId(`A${index}`),
            element: element("C"),
          })),
          bonds: [],
        };
        const layout = layoutMolecule2D(molecule);
        expect(layout.ok).toBe(true);
        if (!layout.ok) return;
        expect(Object.keys(layout.value.positions)).toHaveLength(count);
        for (const position of Object.values(layout.value.positions)) {
          expect(Number.isFinite(position.x)).toBe(true);
          expect(Number.isFinite(position.y)).toBe(true);
        }
      }),
    );
  });
});
