# G1/S Arrest from DNA Damage

Start with a diploid cell at G1 with `dnaContent = 1` and `divisions = 0`. The checkpoint conditions are `{ dnaDamaged: true, replicationComplete: true, chromosomesAligned: true, nutrientsSufficient: true }`.

## Step 1 — identify the gating checkpoint

G1 → S is gated by the **G1/S checkpoint**, which demands no DNA damage and sufficient nutrients.

## Step 2 — evaluate

`dnaDamaged = true` fails the G1/S checkpoint. The cell stays in G1. The checkpoint report lists "DNA damage detected" as the failing reason.

## Step 3 — interpret

The cell does not enter S phase. It will not replicate DNA, will not reach M, and will not divide while damage persists. Setting `dnaDamaged = false` (representing successful repair) lets the next phase-advance call carry the cell from G1 into S, where `dnaContent` becomes 2 on completion of replication, and the cell can then advance to G2 → M and divide.

This is the introductory model for how the cell protects its genome from propagating mutations to daughters. In cancer biology the same checkpoint is the one that frequently fails (e.g. p53 loss-of-function), allowing damaged cells to advance and accumulate further mutations.
