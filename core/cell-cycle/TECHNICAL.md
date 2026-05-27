# @paideia/cell-cycle Technical Notes

## Public Interface Summary

Two enum-like literal types (`Phase`, `CheckpointName`), two branded numerics
(`Ploidy`, `DnaContentMultiplier`), five record types (`CellState`,
`CheckpointConditions`, `CheckpointStatus`, `InitialCellOptions`,
`PhaseAdvanceResult`), two validating constructors, three pure helpers
(`initialCell`, `evaluateCheckpoint`, `attemptPhaseAdvance`), and two
division operations (`divideMitosis`, `divideMeiosis`).

All fallible operations return `KernelResult<T>` from `@paideia/shared`. No
`any` in public APIs. All transitions return fresh objects.

## Invariant Enforcement

| Invariant | Enforcement |
|---|---|
| `Ploidy` is a positive integer | `ploidy` constructor; `ensureValidState` re-validates inside every transition. |
| `DnaContentMultiplier` is finite and `>= 1` | `dnaContentMultiplier` constructor; `ensureValidState` re-validates. |
| `CellState.divisions` is a non-negative integer | `ensureValidState` rejects fractional or negative divisions. |
| Checkpoints gate the correct transitions | `attemptPhaseAdvance` dispatches `G1/S` → S, `G2/M` → M, and reports `Spindle` while in M (division is the caller's explicit step). |
| Mitosis requires `phase = "M"` and `dnaContent = 2` | Explicit checks return `precondition-violated` / `out-of-domain`. |
| Meiosis requires `phase = "M"`, `dnaContent = 2`, and even ploidy | Explicit checks. Odd ploidy returns `out-of-domain`. |
| Inputs are not mutated | All transitions return fresh objects (spread + override pattern). |
| Mitosis preserves ploidy | Daughter ploidy = parent ploidy; asserted by tests. |
| Meiosis halves ploidy | Daughter ploidy = parent ploidy / 2; asserted by tests. |
| S → G2 doubles DNA content | The `S` branch sets `dnaContent: TWO`; asserted by tests. |

## Algorithm

The transition function is a `switch` on `state.phase`. Each branch:

1. Re-validates the state with `ensureValidState`.
2. Evaluates the relevant checkpoint (if any).
3. Returns either `{ next: advancedState, advanced: true, checkpoint }` or
   `{ next: state, advanced: false, checkpoint }`.

The division operations are total mappings from a valid M-phase, replicated
parent to either a 2-tuple (mitosis) or 4-tuple (meiosis) of fresh G1 daughter
cells.

## Dependencies and License Status

| Dependency | Kind | Version | License |
|---|---|---|---|
| `@paideia/shared` | runtime | workspace | MIT (project) |
| `fast-check` | dev | `^3.23.2` | MIT |
| `typescript` | dev | `^5.6.0` | Apache-2.0 |
| `vitest` | dev | `^4.1.7` | MIT |

No new third-party runtime dependencies.

## Test Strategy

- **Constructors:** every error path of `ploidy` and `dnaContentMultiplier`.
- **Checkpoints:** each checkpoint's failure mode and a happy-path pass.
- **Phase advance:** every phase transition under happy conditions and at
  least one failure mode (DNA damage in G1, incomplete replication in S,
  no nutrients in G0).
- **Mitosis:** happy-path daughter properties; rejection outside M; rejection
  when DNA isn't doubled.
- **Meiosis:** happy-path 4 gametes; odd-ploidy rejection; outside-M rejection;
  unreplicated rejection.

## Anieyrudh Filter pass

Date: 2026-05-26
Filter version: aniegpt v1.0 (kernel author self-audit)

### P0 issues

- None observed. Public interface matches `AGENTS.md`. No `any`. No silent
  catches. No species-specific labels. All transitions are pure.

### P1 issues

- The `G0 → G1` re-entry is gated solely on `nutrientsSufficient`. Real
  biology also involves growth-factor signalling; the kernel deliberately
  models the introductory-textbook view. Flagged for future extension.
- The kernel does not model cytokinesis as a distinct step; mitosis and
  meiosis both produce daughter cells in one call. For introductory cell-
  cycle containers this is the correct abstraction.

### P2 follow-ups (deferred)

- `coverMeioticCrossover` step that records recombination events. Out of
  scope for the introductory container.
- Cyclin/CDK molecular dynamics layer that composes with
  `core/signal-pathway` and `core/dynamical-systems`.
- Apoptosis branch for damaged cells that fail repeated checkpoints. Today
  the kernel lets a damaged cell stay in G1 indefinitely; an apoptosis path
  would close that loop.

### High-bandwidth questions surfaced

- Should `divideMeiosis` always return 4 cells, or 2 (meiosis I) and then 4
  (meiosis II)? The introductory view bundles them into one step; sims that
  need step-by-step meiosis can call the kernel once and then label the
  intermediate. Flagged for future expansion.
- Should `Ploidy` and `DnaContentMultiplier` migrate to `core/shared` if a
  future genetics kernel needs them? Today only this kernel uses them.
