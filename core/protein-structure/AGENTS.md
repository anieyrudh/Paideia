# core/protein-structure · agent contract

## What this module is

The deterministic protein-property kernel for Paideia simulations: per-residue
amino-acid properties (hydropathy, charge class, polarity class, molecular
weight), sliding-window hydropathy profile, and a coarse hydrophobic-region
classifier useful for transmembrane-segment intuition. It owns the small,
literature-fixed numeric tables and the standard windowed scoring procedure so
sims do not hand-roll the Kyte-Doolittle scale or the windowing convention.

This kernel is **not** a folding engine, **not** a secondary-structure
predictor (no Chou-Fasman, no PSIPRED), and **not** a 3D structure modeller.
Containers that need those should compose this kernel with a future
`core/protein-folding` or `core/structure-predictor` and surface that need as
a `core-change-proposal`.

## Public interface

Exports from `@paideia/protein-structure`:

- `type AminoAcidLetter` — branded one-letter symbol from the 20 standard amino
  acids; rejects `*` and ambiguity letters. Reused by sims that already hold a
  `ProteinSequence` from `core/sequence`.
- `type Hydropathy` — branded number on the Kyte-Doolittle scale, dimensionless.
- `type MolecularWeight` — branded number, daltons (Da).
- `type ChargeClass` — `"positive" | "negative" | "neutral"`.
- `type PolarityClass` — `"polar" | "nonpolar"`.
- `type RegionLabel` — `"hydrophobic" | "hydrophilic" | "neutral"`.
- `interface AminoAcidProperties` — `{ letter; threeLetter; name; hydropathy; molecularWeight; charge; polarity }`.
- `interface HydropathyProfilePoint` — `{ index; centreLetter; meanHydropathy; region }`.
- `interface HydropathyProfile` — `{ windowSize: number; points: ReadonlyArray<HydropathyProfilePoint> }`.
- `aminoAcidLetter(input: string): KernelResult<AminoAcidLetter>` — accepts the 20 standard letters; rejects `*`, `B`, `Z`, `J`, `X`, `U`, `O`, and lowercase.
- `aminoAcidProperties(letter: AminoAcidLetter): AminoAcidProperties` — total lookup over the 20-letter alphabet; cannot fail for a properly branded input.
- `kyteDoolittleHydropathy(letter: AminoAcidLetter): Hydropathy` — total lookup.
- `chargeClass(letter: AminoAcidLetter): ChargeClass` — total lookup.
- `polarityClass(letter: AminoAcidLetter): PolarityClass` — total lookup.
- `hydropathyProfile(sequence: string, windowSize: number, options?: { hydrophobicThreshold?: Hydropathy; hydrophilicThreshold?: Hydropathy }): KernelResult<HydropathyProfile>` — validates the sequence with `aminoAcidLetter`, slides an odd-sized window across the sequence, computes the mean Kyte-Doolittle score per window, and classifies each window as `"hydrophobic"` / `"hydrophilic"` / `"neutral"` against the optional thresholds (defaults: `+1.6` for hydrophobic, `−0.5` for hydrophilic, as commonly used in introductory transmembrane heuristics).

## Invariants the caller must preserve

- Input strings are uppercase and over the 20 standard amino-acid letters.
- `windowSize` is an odd positive integer >= 1, no larger than the sequence
  length. Even windows are rejected because the profile point is anchored to
  the centre residue.
- Threshold options, if present, are finite numbers with
  `hydrophilicThreshold <= hydrophobicThreshold`.
- All lookup functions are total over the validated alphabet; this is the
  whole reason for the brand.

## What this module does NOT do

- Does **not** predict secondary structure (alpha helix / beta sheet / turn).
- Does **not** predict folding free energy or contact maps.
- Does **not** parse PDB, CIF, or any structure file format.
- Does **not** model post-translational modifications.
- Does **not** expose alternative hydropathy scales (Hopp-Woods, Eisenberg,
  Engelman). The Kyte-Doolittle scale is the introductory-textbook default; a
  future kernel can expose alternatives as a separate symbol.
- Does **not** render anything.

## When to consider this module

Use `core/protein-structure` when a sim needs per-residue hydropathy / charge /
polarity / molecular weight, or a windowed hydropathy plot for
transmembrane-segment intuition. If a container is about to inline a
20-element Kyte-Doolittle table or a windowed-average loop, stop and use this
module.

## Extension protocol

1. Open a `core-change-proposal` issue naming every current consumer.
2. Wait for both branches' CI green.
3. Use `core!:` commit prefix for any change that:
   - alters the Kyte-Doolittle table values,
   - changes the brand identity of any exported type,
   - changes the default thresholds in `hydropathyProfile`,
   - relaxes the rejection of `*` from the public API.

## Anti-patterns (will be rejected in PR review)

- Returning `null`, `undefined`, or throwing for expected validation failures.
- Accepting `*` (stop codon) or lower-case input without normalising or
  rejecting at the boundary.
- Smuggling in a second hydropathy scale through the same symbol — alternates
  require a separate function and a contract change.
- Adding GPL or non-CC-BY datasets. The Kyte-Doolittle table is a
  scientific-literature fact (Kyte and Doolittle, *J. Mol. Biol.*, 1982,
  157(1), 105–132); the values themselves are not copyrightable.
