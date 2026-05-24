import { err, ok, type Brand, type KernelResult } from "@paideia/shared";

export type MoleculeAtomId = Brand<string, "Molecule.AtomId">;
export type ElementSymbol = Brand<string, "Molecule.ElementSymbol">;
export type AtomicMass = Brand<number, "Molecule.AtomicMass">;
export type MolecularMass = Brand<number, "Molecule.MolecularMass">;
export type BondOrder = 1 | 2 | 3 | "aromatic";

export interface AtomPosition2D {
  readonly x: number;
  readonly y: number;
}

export interface AtomPosition3D {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface MoleculeAtom {
  readonly id: MoleculeAtomId;
  readonly element: ElementSymbol;
  readonly charge?: number;
  readonly isotope?: number;
  readonly position2d?: AtomPosition2D;
  readonly position3d?: AtomPosition3D;
}

export interface MoleculeBond {
  readonly from: MoleculeAtomId;
  readonly to: MoleculeAtomId;
  readonly order: BondOrder;
}

export interface MoleculeGraph {
  readonly atoms: readonly MoleculeAtom[];
  readonly bonds: readonly MoleculeBond[];
}

export interface MoleculeFormula {
  readonly hill: string;
  readonly counts: Readonly<Record<string, number>>;
}

export interface MoleculeLayout2D {
  readonly positions: Readonly<Record<string, AtomPosition2D>>;
}

export interface ValenceIssue {
  readonly atomId: MoleculeAtomId;
  readonly element: ElementSymbol;
  readonly observedBondOrder: number;
  readonly maxAllowed: number;
}

export type AtomicMassTable = Readonly<Record<string, AtomicMass>>;

const reservedIds = new Set(["__proto__", "prototype", "constructor"]);
const defaultLayoutRadius = 120;
const defaultLayoutCenter = 0;

export const moleculeAtomId = (value: string): KernelResult<MoleculeAtomId> => {
  if (value.length > 0 && value.trim() === value && !/\s/.test(value) && !reservedIds.has(value)) {
    return ok(value as MoleculeAtomId);
  }
  return err(
    "precondition-violated",
    "Molecule atom id must be non-empty, trimmed, contain no whitespace, and avoid reserved object keys",
  );
};

export const elementSymbol = (value: string): KernelResult<ElementSymbol> =>
  /^[A-Z][a-z]{0,2}$/.test(value)
    ? ok(value as ElementSymbol)
    : err("precondition-violated", "Element symbol must be an uppercase letter followed by zero to two lowercase letters");

export const atomicMass = (value: number): KernelResult<AtomicMass> =>
  Number.isFinite(value) && value > 0
    ? ok(value as AtomicMass)
    : err("out-of-domain", `Atomic mass must be finite and positive, got ${value}`);

export const validateMolecule = (molecule: MoleculeGraph): KernelResult<MoleculeGraph> => {
  const atomIds = new Set<string>();
  for (const atom of molecule.atoms) {
    const validAtom = validateAtom(atom);
    if (!validAtom.ok) return validAtom;
    if (atomIds.has(atom.id)) {
      return err("precondition-violated", `Duplicate molecule atom id: ${atom.id}`);
    }
    atomIds.add(atom.id);
  }

  const bondPairs = new Set<string>();
  for (const bond of molecule.bonds) {
    const validBond = validateBond(bond, atomIds);
    if (!validBond.ok) return validBond;
    const pair = bondPairKey(bond.from, bond.to);
    if (bondPairs.has(pair)) {
      return err("precondition-violated", `Duplicate molecule bond: ${pair}`);
    }
    bondPairs.add(pair);
  }

  return ok(molecule);
};

export const molecularFormula = (molecule: MoleculeGraph): KernelResult<MoleculeFormula> => {
  const valid = validateMolecule(molecule);
  if (!valid.ok) return valid;

  const counts: Record<string, number> = Object.create(null) as Record<string, number>;
  for (const atom of valid.value.atoms) {
    counts[atom.element] = (counts[atom.element] ?? 0) + 1;
  }

  const ordered = orderedElements(counts);
  return ok({
    hill: ordered
      .map((element) => {
        const count = counts[element] ?? 0;
        return `${element}${count === 1 ? "" : count}`;
      })
      .join(""),
    counts,
  });
};

export const molecularMass = (
  molecule: MoleculeGraph,
  atomicMasses: AtomicMassTable,
): KernelResult<MolecularMass> => {
  const formula = molecularFormula(molecule);
  if (!formula.ok) return formula;

  let total = 0;
  for (const [element, count] of Object.entries(formula.value.counts)) {
    const mass = ownNumberValue(atomicMasses, element);
    if (mass === undefined) {
      return err("precondition-violated", `Missing or invalid atomic mass for ${element}`);
    }
    const validMass = atomicMass(mass);
    if (!validMass.ok) return validMass;
    total += validMass.value * count;
  }

  return finiteNumber(total, "molecular mass").ok
    ? ok(total as MolecularMass)
    : err("out-of-domain", "molecular mass must be finite");
};

export const adjacencyList = (
  molecule: MoleculeGraph,
): KernelResult<Readonly<Record<string, readonly MoleculeBond[]>>> => {
  const valid = validateMolecule(molecule);
  if (!valid.ok) return valid;

  const adjacency: Record<string, MoleculeBond[]> = Object.create(null) as Record<string, MoleculeBond[]>;
  for (const atom of valid.value.atoms) {
    adjacency[atom.id] = [];
  }
  for (const bond of valid.value.bonds) {
    adjacency[bond.from]?.push(bond);
    adjacency[bond.to]?.push(reverseBond(bond));
  }

  return ok(freezeAdjacency(adjacency));
};

export const bondOrderTotal = (
  molecule: MoleculeGraph,
  atomId: MoleculeAtomId,
): KernelResult<number> => {
  const validId = moleculeAtomId(atomId);
  if (!validId.ok) return validId;
  const adjacency = adjacencyList(molecule);
  if (!adjacency.ok) return adjacency;
  const bonds = adjacency.value[atomId];
  if (bonds === undefined) {
    return err("precondition-violated", `Unknown atom id: ${atomId}`);
  }
  return ok(bonds.reduce((sum, bond) => sum + numericBondOrder(bond.order), 0));
};

export const validateValence = (
  molecule: MoleculeGraph,
  maxValenceByElement: Readonly<Record<string, number>>,
): KernelResult<readonly ValenceIssue[]> => {
  const valid = validateMolecule(molecule);
  if (!valid.ok) return valid;

  const issues: ValenceIssue[] = [];
  for (const atom of valid.value.atoms) {
    const maxAllowed = ownNumberValue(maxValenceByElement, atom.element);
    if (!Number.isFinite(maxAllowed) || maxAllowed === undefined || maxAllowed <= 0) {
      return err("precondition-violated", `Missing or invalid valence limit for ${atom.element}`);
    }
    const total = bondOrderTotal(valid.value, atom.id);
    if (!total.ok) return total;
    if (total.value > maxAllowed) {
      issues.push({
        atomId: atom.id,
        element: atom.element,
        observedBondOrder: total.value,
        maxAllowed,
      });
    }
  }

  return ok(issues);
};

export const layoutMolecule2D = (
  molecule: MoleculeGraph,
  options: { readonly radius?: number; readonly centerX?: number; readonly centerY?: number } = {},
): KernelResult<MoleculeLayout2D> => {
  const valid = validateMolecule(molecule);
  if (!valid.ok) return valid;
  const radius = options.radius ?? defaultLayoutRadius;
  const centerX = options.centerX ?? defaultLayoutCenter;
  const centerY = options.centerY ?? defaultLayoutCenter;
  if (!Number.isFinite(radius) || radius < 0) {
    return err("out-of-domain", "Layout radius must be finite and non-negative");
  }
  if (!Number.isFinite(centerX) || !Number.isFinite(centerY)) {
    return err("out-of-domain", "Layout center coordinates must be finite");
  }

  const positions: Record<string, AtomPosition2D> = Object.create(null) as Record<string, AtomPosition2D>;
  const atoms = valid.value.atoms;
  for (let index = 0; index < atoms.length; index += 1) {
    const atom = atoms[index];
    if (atom === undefined) continue;
    if (atom.position2d !== undefined) {
      positions[atom.id] = { x: atom.position2d.x, y: atom.position2d.y };
    } else if (atoms.length === 1) {
      positions[atom.id] = { x: centerX, y: centerY };
    } else {
      const angle = (2 * Math.PI * index) / atoms.length - Math.PI / 2;
      positions[atom.id] = {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
      };
    }
  }

  return ok({ positions });
};

const validateAtom = (atom: MoleculeAtom): KernelResult<MoleculeAtom> => {
  const id = moleculeAtomId(atom.id);
  if (!id.ok) return id;
  const element = elementSymbol(atom.element);
  if (!element.ok) return element;
  if (atom.charge !== undefined && !Number.isSafeInteger(atom.charge)) {
    return err("out-of-domain", `Atom ${atom.id} charge must be a safe integer`);
  }
  if (atom.isotope !== undefined && (!Number.isSafeInteger(atom.isotope) || atom.isotope <= 0)) {
    return err("out-of-domain", `Atom ${atom.id} isotope must be a positive safe integer`);
  }
  if (atom.position2d !== undefined) {
    const position = validatePosition2D(atom.position2d);
    if (!position.ok) return position;
  }
  if (atom.position3d !== undefined) {
    const position = validatePosition3D(atom.position3d);
    if (!position.ok) return position;
  }
  return ok(atom);
};

const validateBond = (
  bond: MoleculeBond,
  atomIds: ReadonlySet<string>,
): KernelResult<MoleculeBond> => {
  const from = moleculeAtomId(bond.from);
  if (!from.ok) return from;
  const to = moleculeAtomId(bond.to);
  if (!to.ok) return to;
  if (!atomIds.has(bond.from) || !atomIds.has(bond.to)) {
    return err("precondition-violated", "Molecule bond endpoints must reference existing atoms");
  }
  if (bond.from === bond.to) {
    return err("precondition-violated", "Molecule bond endpoints must be distinct");
  }
  const order = validateBondOrder(bond.order);
  if (!order.ok) return order;
  return ok(bond);
};

const validateBondOrder = (order: BondOrder): KernelResult<BondOrder> =>
  order === 1 || order === 2 || order === 3 || order === "aromatic"
    ? ok(order)
    : err("precondition-violated", "Bond order must be 1, 2, 3, or aromatic");

const validatePosition2D = (position: AtomPosition2D): KernelResult<AtomPosition2D> =>
  Number.isFinite(position.x) && Number.isFinite(position.y)
    ? ok(position)
    : err("out-of-domain", "2D atom positions must be finite");

const validatePosition3D = (position: AtomPosition3D): KernelResult<AtomPosition3D> =>
  Number.isFinite(position.x) && Number.isFinite(position.y) && Number.isFinite(position.z)
    ? ok(position)
    : err("out-of-domain", "3D atom positions must be finite");

const bondPairKey = (left: string, right: string): string =>
  left < right ? `${left}\u0000${right}` : `${right}\u0000${left}`;

const orderedElements = (counts: Readonly<Record<string, number>>): readonly string[] => {
  const elements = Object.keys(counts).sort();
  if (counts.C === undefined) return elements;
  const ordered = ["C"];
  if (counts.H !== undefined) ordered.push("H");
  for (const element of elements) {
    if (element !== "C" && element !== "H") ordered.push(element);
  }
  return ordered;
};

const reverseBond = (bond: MoleculeBond): MoleculeBond => ({
  from: bond.to,
  to: bond.from,
  order: bond.order,
});

const numericBondOrder = (order: BondOrder): number =>
  order === "aromatic" ? 1.5 : order;

const freezeAdjacency = (
  adjacency: Record<string, MoleculeBond[]>,
): Readonly<Record<string, readonly MoleculeBond[]>> => {
  const frozen: Record<string, readonly MoleculeBond[]> = Object.create(null) as Record<string, readonly MoleculeBond[]>;
  for (const [id, bonds] of Object.entries(adjacency)) {
    frozen[id] = Object.freeze([...bonds]);
  }
  return Object.freeze(frozen);
};

const finiteNumber = (value: number, label: string): KernelResult<number> =>
  Number.isFinite(value)
    ? ok(value)
    : err("out-of-domain", `${label} must be finite`);

const ownNumberValue = (
  record: Readonly<Record<string, number>>,
  key: string,
): number | undefined =>
  Object.prototype.hasOwnProperty.call(record, key) ? record[key] : undefined;
