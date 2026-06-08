# core/prediction-gate · Technical Record

## Imports

| Module | Symbols |
| --- | --- |
| `@paideia/shared` | `KernelResult`, `ok`, `err` |
| `@paideia/content-schema` | `TPredictSpec` |
| `react` | `useCallback`, `useEffect`, `useState`, React types |
| `zod` | stored prediction schema validation |

## Public interface

- `PredictionGate`
- `commitPrediction`
- `isPredictionCommitted`
- `isRevealed`
- `clearPrediction`
- `usePredictionCheckpoint`
- `usePredictionGate`
- `PredictionCommit`
- `PredictionEvent`
- `PredictionScope`

## Invariants

- Prediction-commit truth source: enforced by `isPredictionCommitted()` and
  `usePredictionCheckpoint()`, both of which read the central storage schema.
  Deprecated aliases `isRevealed()` and `usePredictionGate()` return the same
  committed state for compatibility.
- Live simulation contract: `PredictionGate` renders children immediately and
  adds a compact checkpoint form or saved-prediction summary.
- Spec-dependent validation: enforced in `validatePrediction()` before the
  component commits.
- Required rationale: enforced in `validatePrediction()` when
  `predict.rationale_required === true`.
- Refresh persistence: enforced by localStorage read on hook mount and covered
  by component tests.
- Explicit clear: exposed only as `clearPrediction()` / hook `clear()`; no
  auto-clear path exists.

## Kernel extensions

None.

## Accessibility

The generic form uses labels, fieldsets for multiple-choice options, and an
alert role for validation errors. First consuming containers still need
Playwright plus axe coverage for their full sim UI.

## Tests

- `src/index.test.ts`
- `src/component.test.tsx`

## How to run locally

```bash
pnpm -F @paideia/prediction-gate build
pnpm -F @paideia/prediction-gate test
```

## Anieyrudh Filter pass

Date: 2026-05-15
Filter version: aniegpt v1.0

### P0 issues

- Potential P0: prediction checkpoint could block the live model. Resolution:
  component renders children before the checkpoint form; tests assert the
  observation text is present before commit.
- Potential P0: localStorage writes outside central writer. Resolution: all
  writes route through `writeStoredPrediction()`.
- Potential P0: empty rationale stored when required. Resolution: component
  runs `validatePrediction()` before commit and rejects blank rationale for
  required specs.

### P1 issues

- Direct low-level `commitPrediction()` cannot validate a `PredictSpec` because
  the AGENTS contract does not include a spec parameter. Resolution: spec
  validation is enforced in `PredictionGate` and documented as a caller
  invariant for low-level direct calls. No deferred issue opened because this
  preserves the declared public interface.

### High-bandwidth questions surfaced

- Should a future `core!:` change add a spec-bearing low-level commit API, or
  should direct `commitPrediction()` remain storage-only?

## Iteration log

- Implemented storage first around the canonical key and Zod-validated stored
  event schema.
- Added internal spec validation for commit-format and rationale rules.
- Added explicit checkpoint aliases while keeping deprecated reveal/gate names
  as compatibility exports.
