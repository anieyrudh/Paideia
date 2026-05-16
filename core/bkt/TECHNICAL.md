# core/bkt · Technical Record

## Imports

| Module | Symbols |
| --- | --- |
| `@paideia/shared` | `ConceptId`, `KernelResult`, `Probability`, `err`, `ok`, `probability` |

## Public interface

- `BKTParameters`
- `MasteryState`
- `Evidence`
- `defaultParameters`
- `updateMastery`
- `predictMastery`
- `fitParameters`

## Invariants

- Pure update: `updateMastery()` allocates a new state and reads no global
  mutable state.
- Runtime probability guard: every public probability input is checked against
  `[0, 1]` before update or fitting math.
- Concept boundary: evidence for one concept cannot update another concept's
  `MasteryState`.
- Deterministic fit: `fitParameters()` sorts evidence by timestamp, concept,
  and `itemId`, then runs a fixed-count EM pass with no randomness.
- No persistence: callers store `MasteryState`; this module only returns values.

## Kernel extensions

None.

## Tests

- `src/index.test.ts`

## How to run locally

```bash
pnpm -F @paideia/bkt build
pnpm -F @paideia/bkt test
```

## Anieyrudh Filter pass

Date: 2026-05-16
Filter version: aniegpt v1.0

### P0 issues

- Potential P0: mastery could drift without evidence. Resolution:
  `updateMastery()` only changes state from explicit `Evidence`, and tests cover
  deterministic replay of the same input.
- Potential P0: incorrect evidence could be ignored or flattened. Resolution:
  tests assert incorrect evidence moves high mastery downward before learning is
  applied.
- Potential P0: cross-concept contamination. Resolution: mismatched
  `conceptId` returns `precondition-violated`.

### P1 issues

- `fitParameters()` receives no learner or cohort id in the declared interface,
  so it treats the provided history as one deterministic observation sequence.
  Consumers needing per-learner segmentation must segment before calling.

### High-bandwidth questions surfaced

- Should a future `core!:` change add cohort/learner grouping to `Evidence`, or
  should sequence segmentation remain a caller responsibility?

## Iteration log

- Implemented the classical two-state BKT Bayes update first.
- Added scaled forward-backward EM fitting with fixed iterations to keep fitting
  deterministic and auditable.
- Kept all state persistence and course-specific parameter calibration outside
  the module boundary.
