# core/cell-cycle · agent contract

## What this module is

The deterministic cell-cycle state-machine kernel: phase transitions
(G1 → S → G2 → M → G1/G0), checkpoint validation
(G1/S, G2/M, spindle assembly), DNA-content and ploidy bookkeeping across
mitosis and meiosis. Owns the small finite-state-machine logic that recurring
sims would otherwise reinvent.

## Public interface

Exports from `@paideia/cell-cycle`:

- `type Phase` — `"G0" | "G1" | "S" | "G2" | "M"`.
- `type CheckpointName` — `"G1/S" | "G2/M" | "Spindle"`.
- `type Ploidy` — branded positive integer (e.g. 1 = haploid, 2 = diploid).
- `type DnaContentMultiplier` — branded number ≥ 1 (e.g. 1 = unreplicated, 2 = replicated, 4 = paired sister chromatids in M).
- `interface CellState` — `{ phase: Phase; ploidy: Ploidy; dnaContent: DnaContentMultiplier; divisions: number }`.
- `interface CheckpointConditions` — `{ dnaDamaged: boolean; replicationComplete: boolean; chromosomesAligned: boolean; nutrientsSufficient: boolean }`.
- `interface CheckpointStatus` — `{ name: CheckpointName; satisfied: boolean; reasons: ReadonlyArray<string> }`.
- `ploidy(value: number): KernelResult<Ploidy>`
- `dnaContentMultiplier(value: number): KernelResult<DnaContentMultiplier>`
- `initialCell(options?: { ploidy?: Ploidy; phase?: Phase }): CellState` — default `{ phase: "G1", ploidy: 2, dnaContent: 1, divisions: 0 }`.
- `evaluateCheckpoint(name: CheckpointName, conditions: CheckpointConditions): CheckpointStatus`
- `attemptPhaseAdvance(state: CellState, conditions: CheckpointConditions): KernelResult<{ next: CellState; advanced: boolean; checkpoint: CheckpointStatus | null }>` — applies the relevant checkpoint, advances to the next phase on success, stays in the same phase on failure.
- `divideMitosis(state: CellState): KernelResult<readonly [CellState, CellState]>` — requires `phase = "M"` and `dnaContent = 2`; emits two `G1` daughter cells with the original ploidy and `dnaContent = 1`.
- `divideMeiosis(state: CellState): KernelResult<readonly [CellState, CellState, CellState, CellState]>` — requires `phase = "M"`, `dnaContent = 2`, and an even ploidy; emits four gamete cells with halved ploidy and `dnaContent = 1`.

## Invariants the caller must preserve

- `Ploidy` is a positive integer.
- `DnaContentMultiplier` is `>= 1` and finite.
- `CellState.divisions` is a non-negative integer; this kernel increments it
  by one for each daughter produced.
- `attemptPhaseAdvance` evaluates the checkpoint that gates the *current*
  phase (G1 → S uses G1/S, G2 → M uses G2/M, M → G1 uses Spindle).
- Mitosis preserves ploidy; meiosis halves it. The kernel rejects an
  attempted meiosis from a haploid (odd-ploidy) cell with `out-of-domain`.

## What this module does NOT do

- Does **not** model time-dependent phase durations (no minutes per phase).
- Does **not** integrate cyclin / CDK molecular dynamics. That belongs in a
  future kernel composed with `core/dynamical-systems` and possibly
  `core/signal-pathway`.
- Does **not** track crossover / recombination events during meiosis.
- Does **not** model apoptosis or senescence pathways.
- Does **not** render anything.

## When to consider this module

Use `core/cell-cycle` when a sim needs to advance a cell through its phases
under checkpoint conditions, or to bookkeep ploidy and DNA content across a
division. If a container is about to inline a `switch (phase) { case "G1":
... }` finite-state machine, stop and use this module.

## Extension protocol

1. Open a `core-change-proposal` issue naming every current consumer.
2. Wait for both branches' CI green.
3. Use `core!:` commit prefix for any change that:
   - alters the phase enumeration,
   - changes which checkpoint gates which transition,
   - changes the daughter-state convention for mitosis or meiosis.

## Anti-patterns (will be rejected in PR review)

- Returning `null`, `undefined`, or throwing for expected validation failures.
- Hard-coding species-specific phase durations or ploidy values.
- Mutating the input `CellState`. All transitions return fresh objects.
- Introducing recombination or apoptosis without a contract change.
