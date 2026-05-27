# Transmembrane Helix Detection

Take the 20-residue peptide `K D L L I V A S K E L L V A T R D K L L` (cytosolic charges flanking a hydrophobic core).

## Step 1 — residue properties

The Kyte-Doolittle values are roughly:

```text
K: -3.9   D: -3.5   L: +3.8   I: +4.5   V: +4.2
A: +1.8   S: -0.8   E: -3.5   T: -0.7   R: -4.5
```

K, D, E, and R are charged and strongly hydrophilic. L, I, and V are strongly hydrophobic.

## Step 2 — windowed mean (W = 9)

The centre positions span indices 4..15. Compute `mean(i) = (sum of nine consecutive H values) / 9`:

- Around index 6 the window is centred on L L I V A S K E L, mean about +0.5 — neutral.
- Around index 8 the window is centred on V A S K E L L V A, mean about -0.1 — neutral.
- Around index 13 the window is centred on L V A T R D K L L, mean about +0.0 — neutral.

The flanking charged residues drag every window into the neutral band; no contiguous run reaches the +1.6 hydrophobic threshold.

## Step 3 — contextualise

No window above +1.6 means the peptide does not present as a candidate transmembrane helix. The hydrophobic residues are real, but they are spread among polar and charged residues. In aqueous solution this peptide would expose its polar groups and bury the hydrophobic side chains — consistent with a soluble or peripheral peptide rather than an integral membrane protein.

## Step 4 — report

The profile suggests a soluble peptide with internal hydrophobic packing. It does not decide the final fold by itself; chain context, ionic strength, and the presence of detergent or membrane mimetic could all change the answer in the laboratory.

A transmembrane helix would instead show a window of 17-25 consecutive residues all above the +1.6 threshold — e.g. swapping the charged residues for additional hydrophobics would push the mean above the threshold and predict a candidate membrane-spanning segment.
