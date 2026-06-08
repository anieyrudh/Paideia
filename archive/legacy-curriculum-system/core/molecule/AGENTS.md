# core/molecule - agent contract

## What this module is

Pure molecular graph helpers for educational chemistry and biology simulations.
It owns validated atoms, bonds, formula counting, caller-supplied mass lookup,
adjacency summaries, simple valence-limit diagnostics, and deterministic 2D
layout metadata for renderers.

This package computes structure evidence only. The consuming app owns rendering,
visual style, molecular data sources, captions, pedagogy, and whether a model is
chemically appropriate for a lesson.

## Public interface

Exports from `@paideia/molecule`:

- `MoleculeAtomId = Brand<string, "Molecule.AtomId">`
- `ElementSymbol = Brand<string, "Molecule.ElementSymbol">`
- `AtomicMass = Brand<number, "Molecule.AtomicMass">` - atomic mass units.
- `MolecularMass = Brand<number, "Molecule.MolecularMass">` - atomic mass units.
- `BondOrder = 1 | 2 | 3 | "aromatic"`
- `AtomPosition2D = { x: number; y: number }`
- `AtomPosition3D = { x: number; y: number; z: number }`
- `MoleculeAtom = { id: MoleculeAtomId; element: ElementSymbol; charge?: number; isotope?: number; position2d?: AtomPosition2D; position3d?: AtomPosition3D }`
- `MoleculeBond = { from: MoleculeAtomId; to: MoleculeAtomId; order: BondOrder }`
- `MoleculeGraph = { atoms: readonly MoleculeAtom[]; bonds: readonly MoleculeBond[] }`
- `MoleculeFormula = { hill: string; counts: Readonly<Record<string, number>> }`
- `MoleculeLayout2D = { positions: Readonly<Record<string, AtomPosition2D>> }`
- `ValenceIssue = { atomId: MoleculeAtomId; element: ElementSymbol; observedBondOrder: number; maxAllowed: number }`
- `AtomicMassTable = Readonly<Record<string, AtomicMass>>`
- `moleculeAtomId(value: string): KernelResult<MoleculeAtomId>`
- `elementSymbol(value: string): KernelResult<ElementSymbol>`
- `atomicMass(value: number): KernelResult<AtomicMass>`
- `validateMolecule(molecule: MoleculeGraph): KernelResult<MoleculeGraph>`
- `molecularFormula(molecule: MoleculeGraph): KernelResult<MoleculeFormula>`
- `molecularMass(molecule: MoleculeGraph, atomicMasses: AtomicMassTable): KernelResult<MolecularMass>`
- `adjacencyList(molecule: MoleculeGraph): KernelResult<Readonly<Record<string, readonly MoleculeBond[]>>>`
- `bondOrderTotal(molecule: MoleculeGraph, atomId: MoleculeAtomId): KernelResult<number>`
- `validateValence(molecule: MoleculeGraph, maxValenceByElement: Readonly<Record<string, number>>): KernelResult<readonly ValenceIssue[]>`
- `layoutMolecule2D(molecule: MoleculeGraph, options?: { radius?: number; centerX?: number; centerY?: number }): KernelResult<MoleculeLayout2D>`

## Invariants the caller must preserve

- Atom ids are non-empty trimmed strings with no whitespace and are not reserved
  object keys such as `__proto__`, `prototype`, or `constructor`.
- Element symbols are plain element-like symbols: uppercase letter followed by
  zero to two lowercase letters.
- Atom ids are unique.
- Optional charges are safe integers.
- Optional isotope mass numbers are positive safe integers.
- Optional positions are finite numbers.
- Bond endpoints reference existing atoms, are distinct, and each unordered pair
  appears at most once.
- Bond orders are exactly `1`, `2`, `3`, or `"aromatic"`; aromatic contributes
  `1.5` to bond-order totals.
- Atomic masses are caller-supplied, finite, positive, and branded as atomic
  mass units.
- Valence limits are caller-supplied, finite, and positive.
- Formula output uses Hill order: carbon first, hydrogen second, then all other
  elements alphabetically.
- Layout output is deterministic and never mutates caller atoms.

Violations return `KernelResult.err("precondition-violated", ...)` or
`KernelResult.err("out-of-domain", ...)`.

## What this module does NOT do

- Does not render molecules, orbitals, surfaces, reactions, or animations.
- Does not parse SMILES, InChI, MOL, SDF, PDB, CIF, or image/OCR input.
- Does not ship element masses, covalent radii, valence tables, force fields, or
  biomolecular databases.
- Does not infer bond orders, stereochemistry, conformers, charges, or
  resonance structures.
- Does not fetch remote molecular data.
- Does not decide toxicity, safety, drug-likeness, correctness, or syllabus
  relevance.
- Does not import branch-specific presets or flags.

## When to consider this module

Use `core/molecule` when a container needs local molecule graph validation,
formula/mass readouts, bond-order summaries, valence warnings, or a deterministic
layout seed for a renderer. If you need quantitative chemistry formulas, use
`core/chemistry`; if you need a 3D scene boundary, use `core/three-scene`.

## Extension protocol

1. Open a `core-change-proposal` issue naming every current molecule consumer.
2. Wait for both branches' CI green (`core-changed.yml`).
3. Use `core!:` for changes to validation, formula ordering, mass semantics,
   valence semantics, or layout determinism.

## Anti-patterns (will be rejected in PR review)

- Bundling uncited chemical databases or GPL/proprietary structure files.
- Treating a valence warning as definitive chemical truth.
- Mutating caller atoms while generating layout.
- Silently dropping malformed atoms or bonds.
- Parsing external file formats inside this kernel.
- Rendering learner UI from this package.
- Branch-specific molecule presets or syllabus logic.

## How the Anieyrudh Filter reads this module

The Filter probes that molecular visuals remain honest: formula and mass readouts
must come from the displayed atoms, valence warnings must disclose caller-supplied
limits, and layout metadata must not pretend to be a physical conformer.
