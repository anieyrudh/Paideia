# @paideia/cell-cycle

Deterministic cell-cycle state machine for Paideia simulations. Phase
transitions (G0 / G1 / S / G2 / M), checkpoint evaluation (G1/S, G2/M,
Spindle), and ploidy + DNA-content bookkeeping across mitosis and meiosis.

## Exports

- `Phase`, `CheckpointName`
- `Ploidy`, `DnaContentMultiplier`
- `CellState`, `CheckpointConditions`, `CheckpointStatus`, `InitialCellOptions`, `PhaseAdvanceResult`
- `ploidy`, `dnaContentMultiplier`
- `initialCell`, `evaluateCheckpoint`
- `attemptPhaseAdvance`, `divideMitosis`, `divideMeiosis`

## Usage

```ts
import {
  attemptPhaseAdvance,
  divideMitosis,
  initialCell,
} from "@paideia/cell-cycle";

let cell = initialCell();
const happy = {
  dnaDamaged: false,
  replicationComplete: true,
  chromosomesAligned: true,
  nutrientsSufficient: true,
};

for (let i = 0; i < 4; i += 1) {
  const advance = attemptPhaseAdvance(cell, happy);
  if (!advance.ok) throw new Error(advance.error.message);
  cell = advance.value.next;
  // Walks G1 -> S -> G2 -> M; reports the relevant checkpoint at each step.
}

const daughters = divideMitosis(cell);
// daughters.value === [{ phase: "G1", ploidy: 2, dnaContent: 1, divisions: 1 }, ...]
```

## Scope

Owns the finite-state machine and the per-checkpoint validation. Does NOT
model phase durations, cyclin/CDK dynamics, recombination, or apoptosis.
