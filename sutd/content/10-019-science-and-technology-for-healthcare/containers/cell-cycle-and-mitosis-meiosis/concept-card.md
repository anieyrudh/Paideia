---
subject: 10-019-science-and-technology-for-healthcare
concept: cell-cycle-and-mitosis-meiosis
branch: sutd
level: Freshmore
syllabus_ref: SUTD 10.019 Science and Technology for Healthcare / Cell cycle and mitosis/meiosis
prerequisites:
  - cell-structure-and-the-membrane
  - gene-expression-dna-to-rna-to-protein
aid_types:
  - simulation
  - misconception-audit
  - transfer-problem
status: draft
---

# Cell Cycle and Mitosis / Meiosis

A dividing cell visits five phases in order: **G0** (quiescent), **G1** (growth), **S** (DNA synthesis), **G2** (further growth and damage checks), and **M** (mitosis or meiosis). Transitions between phases are not on a clock; they are gated by **checkpoints** that test molecular conditions:

- **G1/S checkpoint** demands no DNA damage and sufficient nutrients.
- **G2/M checkpoint** demands complete DNA replication and no remaining damage.
- **Spindle assembly checkpoint** demands every chromosome is correctly attached to the mitotic spindle.

In **mitosis**, one parent cell with ploidy `n` and DNA content `2` (replicated) produces **two daughters** with ploidy `n` and DNA content `1`. In **meiosis**, a single division round halves ploidy: one parent with ploidy `n` and DNA content `2` produces **four daughters** with ploidy `n / 2` and DNA content `1`. The kernel only accepts meiosis from even-ploidy parents.

## First-Principles Explanation

The cell cycle is a finite-state machine. Phase advances are conditional on checkpoint inputs; division is the special M-phase exit that produces fresh cells. Tracking ploidy and DNA content separately distinguishes a freshly replicated diploid (n = 2, dnaContent = 2) from a newly born diploid daughter (n = 2, dnaContent = 1) and from a haploid gamete (n = 1, dnaContent = 1). Confusing these three is the most common pedagogical pitfall.

## Canonical Example

Start with a diploid cell at G1. Tick through G1 → S → G2 → M with the "happy" checkpoint set (no DNA damage, replication complete, chromosomes aligned, nutrients sufficient). At M, choose mitosis: two diploid G1 daughters with DNA content 1. If you instead choose meiosis: four haploid G1 gametes with DNA content 1.

Now flip "DNA damaged" on at G1. The G1/S checkpoint fails; the cell stays in G1 until damage is repaired. Switch the cell to G0 with "nutrients sufficient = false" and the cell sits indefinitely; restore nutrients and it re-enters G1.

## Common Misconceptions

- "Mitosis halves chromosome number." It does not; mitosis preserves ploidy. Meiosis halves it.
- "Phase transitions happen on a clock." They are checkpoint-gated; conditions decide when (or whether) the cell advances.
- "DNA content always equals ploidy." Not in G2 or M; replicated diploid cells carry DNA content 2 even though they are still 2n.
- "Meiosis works on haploid cells too." The kernel rejects meiosis on odd-ploidy parents because halving ploidy must be a clean integer division.

## Transfer

The same state-machine view underlies cancer pathology (p53 checkpoint loss), gametogenesis, and the cell-cycle phases of pluripotent stem cells. Each downstream container picks up either the molecular detail (cyclin/CDK kinetics via signal-pathway and gene-regulatory-network) or the population dynamics (clonal evolution).
