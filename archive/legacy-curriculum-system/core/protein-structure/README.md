# @paideia/protein-structure

Deterministic protein-property primitives for Paideia simulations. Provides
per-residue amino-acid properties (hydropathy, charge, polarity, molecular
weight) and a sliding-window hydropathy profile useful for transmembrane-segment
intuition.

## Exports

- `AminoAcidLetter`, `Hydropathy`, `MolecularWeight`
- `ChargeClass`, `PolarityClass`, `RegionLabel`
- `AminoAcidProperties`, `HydropathyProfilePoint`, `HydropathyProfile`, `HydropathyProfileOptions`
- `aminoAcidLetter`, `aminoAcidProperties`
- `kyteDoolittleHydropathy`, `chargeClass`, `polarityClass`
- `hydropathyProfile`

## Usage

```ts
import {
  aminoAcidProperties,
  aminoAcidLetter,
  hydropathyProfile,
} from "@paideia/protein-structure";

const m = aminoAcidLetter("M");
if (m.ok) {
  const props = aminoAcidProperties(m.value);
  // props.name === "Methionine", props.polarity === "nonpolar"
}

const profile = hydropathyProfile(
  "MFNRQFLPVALLSAALAGCAQEDDTL",
  9,
);
if (profile.ok) {
  // profile.value.points[i] = { index, centreLetter, meanHydropathy, region }
}
```

## Scope

This kernel owns property-lookup and windowed-mean math. It deliberately does
NOT predict secondary structure, fold, or 3D geometry. It also does not parse
PDB / CIF files and does not model post-translational modifications. Each of
those belongs in a separate kernel or is out-of-scope.
