---
subject: 10-019-science-and-technology-for-healthcare
concept: gene-expression-dna-to-rna-to-protein
branch: sutd
level: Freshmore
syllabus_ref: SUTD 10.019 Science and Technology for Healthcare / Gene expression
prerequisites:
  - sequence-and-codon-table
  - hill-activation-function
aid_types:
  - simulation
  - misconception-audit
  - transfer-problem
status: draft
---

# Gene Expression: DNA to RNA to Protein

The central dogma says that genetic information flows from DNA to RNA to protein in linear, ordered steps. **Transcription** copies a DNA template into messenger RNA by replacing thymine with uracil. **Translation** reads the mRNA three letters at a time through the standard genetic code and produces a polypeptide.

Layer on top of these two steps a kinetics view. Transcription is gated by a regulator (often an activator or repressor protein) whose effect we describe with a Hill function:

```latex
R = \frac{[I]^n}{K^n + [I]^n}
```

where `[I]` is the inducer concentration, `K` is the half-max threshold, and `n` is the cooperativity (Hill coefficient). The instantaneous transcription rate is then `alpha_0 + (alpha_max - alpha_0) * R`. With first-order mRNA degradation `k_M` and first-order protein degradation `k_P`, the mRNA and protein levels follow:

```latex
\frac{dM}{dt} = \alpha_0 + (\alpha_{\max} - \alpha_0) R - k_M M
\qquad
\frac{dP}{dt} = k_{\text{tr}} M - k_P P
```

At steady state, `dM/dt = 0` gives `M^* = transcription / k_M`, and `dP/dt = 0` gives `P^* = k_{tr} M^* / k_P`. Raising the inducer raises `R`, which raises transcription, which raises both steady states — but only up to a saturating plateau set by `alpha_max`.

## First-Principles Explanation

Every step in the central dogma is a chemical reaction with a rate and a half-life. Steady-state levels are the balance between supply and decay. The Hill function expresses how a single regulator scales transcription supply.

The reading frame and codon table are universal (with rare exceptions). A point mutation in DNA propagates through transcription unchanged except for the T→U swap; translation reads it in groups of three and may produce a different amino acid (or a stop). The downstream protein sequence is the central pedagogical artifact.

## Canonical Example

Take a DNA segment `ATG GAA CTG TTC TAA`. Transcribe: `AUG GAA CUG UUC UAA`. Translate (frame 0): `M E L F *` — methionine, glutamate, leucine, phenylalanine, then a stop codon. The same segment with a single point mutation `ATG GAA CTG TTC TAT` reads `AUG GAA CUG UUC UAU`, which translates to `M E L F Y` — adding tyrosine. The codon table changes the downstream protein in one step; the kinetics changes how much of that protein is around.

## Common Misconceptions

- "Inducer immediately increases protein." There is always an mRNA intermediate with its own decay time; protein lags.
- "Hill responses are linear." The Hill function is sigmoidal; it saturates at `alpha_max`.
- "All cells express all genes equally." Tissue-specific transcription factors and chromatin state set baseline regulator concentrations.
- "Each codon has exactly one amino acid." Multiple codons code for the same amino acid; the degeneracy is essential and prevents many point mutations from changing the protein at all.

## Transfer

Steady-state gene expression is the building block for synthetic-biology design (toggle switches, oscillators), for diagnostic primer-design intuition (codon degeneracy), and for the gene-regulatory networks that drive development. Each downstream container picks up the same DNA-to-RNA-to-protein pipeline and adds either kinetics (signalling pathways) or geometry (cell cycle, immune response).
