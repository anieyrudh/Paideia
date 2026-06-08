# core/molecule · Technical Record

## Public Interface

`@paideia/molecule` exports branded atom, element, atomic-mass, and
molecular-mass identifiers, molecule graph types, formula/layout/valence types,
and pure helpers for validation, formula counting, mass lookup, adjacency,
bond-order totals, valence-limit diagnostics, and deterministic 2D layout.

The package is pure TypeScript. It does not render molecules, parse external
formats, fetch data, ship chemical databases, infer chemistry, persist state, or
import branch code.

## Invariant Enforcement

| Invariant | Enforcement |
|---|---|
| Atom ids are trimmed, whitespace-free, and not reserved object keys | `moleculeAtomId()` |
| Element symbols are plain element-like symbols | `elementSymbol()` |
| Atomic masses are positive finite branded values | `atomicMass()` |
| Atom ids are unique | `validateMolecule()` |
| Charges and isotopes are safe integers in valid ranges | `validateAtom()` |
| Positions are finite numbers | `validatePosition2D()` and `validatePosition3D()` |
| Bonds reference existing distinct atoms and are not duplicated | `validateMolecule()` |
| Bond order is exactly `1`, `2`, `3`, or `"aromatic"` | `validateBondOrder()` |
| Atomic masses and valence limits are own positive finite caller data | `molecularMass()`, `validateValence()`, branded mass type, and prototype-inheritance regression tests |
| Aromatic bonds contribute `1.5` to bond-order totals | `bondOrderTotal()` and regression test |
| Formula output uses Hill order | `molecularFormula()` and tests |
| Layout is deterministic and input-preserving | `layoutMolecule2D()` and property tests |

## Dependency and License Notes

Runtime dependencies:

- `@paideia/shared` via workspace dependency.

Dev-only dependencies:

- `fast-check`, `typescript`, and `vitest`, matching existing pure core
  packages.

No runtime molecular parser, renderer, database, force field, or data table is
bundled.

## P2 Followups

- Add `core/molecule` to `docs/core-modules.md` as implemented during the
  end-of-wave docs catalogue refresh.
- If future containers need SMILES/PDB parsing, create a separate ADR and
  license review instead of widening this kernel silently.

## Anieyrudh Filter pass

Date: 2026-05-24
Filter version: aniegpt v1.0

### P0 issues

- Risk: molecule diagrams could imply physical 3D truth from a simple layout.
  Resolution: `layoutMolecule2D()` is documented as deterministic diagram
  metadata only, not a conformer or force-field result.

### P1 issues

- Risk: valence warnings could be treated as definitive chemistry. Resolution:
  `validateValence()` only compares against caller-supplied limits and returns
  explicit observed totals plus limits. Inherited prototype values are rejected
  so tables must provide their own entries.

### High-bandwidth questions surfaced

- Future molecular file parsing should be a separate kernel or adapter with a
  clean license review and test corpus, not bundled into this pure graph helper.

## Iteration log

- Kept rendering, parsing, molecular databases, and chemistry inference out of
  scope.
- Added malformed graph tests for duplicate atoms, bad bonds, duplicate bonds,
  missing mass data, and valence warnings.
- Added property coverage for formula atom counts and deterministic layout.
