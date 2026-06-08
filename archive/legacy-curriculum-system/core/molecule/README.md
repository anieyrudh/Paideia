# @paideia/molecule

Pure molecular graph helpers for local educational simulations.

This package validates atoms and bonds, derives formula and mass readouts from
caller-supplied data, computes adjacency and bond-order summaries, checks
caller-supplied valence limits, and emits deterministic 2D layout metadata. It
does not render molecules, parse external molecule files, fetch data, or ship
chemical databases.

## Example

```ts
import {
  elementSymbol,
  atomicMass,
  layoutMolecule2D,
  molecularMass,
  molecularFormula,
  moleculeAtomId,
  validateMolecule,
} from "@paideia/molecule";

const oxygen = moleculeAtomId("O1");
const hydrogen1 = moleculeAtomId("H1");
const hydrogen2 = moleculeAtomId("H2");
const O = elementSymbol("O");
const H = elementSymbol("H");
const hMass = atomicMass(1.008);
const oMass = atomicMass(15.999);

if (oxygen.ok && hydrogen1.ok && hydrogen2.ok && O.ok && H.ok && hMass.ok && oMass.ok) {
  const water = validateMolecule({
    atoms: [
      { id: oxygen.value, element: O.value },
      { id: hydrogen1.value, element: H.value },
      { id: hydrogen2.value, element: H.value },
    ],
    bonds: [
      { from: oxygen.value, to: hydrogen1.value, order: 1 },
      { from: oxygen.value, to: hydrogen2.value, order: 1 },
    ],
  });

  const formula = water.ok ? molecularFormula(water.value) : water;
  const mass = water.ok ? molecularMass(water.value, { H: hMass.value, O: oMass.value }) : water;
  const layout = water.ok ? layoutMolecule2D(water.value) : water;
}
```

## Conventions

- Formula strings use Hill order.
- Aromatic bonds count as `1.5` for bond-order totals.
- Mass and valence tables are caller-supplied, not bundled.
- Layout points are deterministic diagram seeds, not physical conformers.
