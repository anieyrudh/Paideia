# core/fsrs · Technical Record

## Imports

| Module | Symbols |
| --- | --- |
| `@paideia/shared` | `Brand`, `KernelResult`, `err`, `ok` |
| `react` | `createElement`, `ReactNode` |

## Public interface

- `ReviewRating`
- `ReviewCard`
- `NextReview`
- `scheduleReview`
- `newCard`
- `dueCards`
- `ReviewQueue`
- `ReviewQueueProps`
- `CardId`
- `ReviewState`

## Invariants

- Pure scheduling: `scheduleReview()` depends only on `(card, rating, now)` and
  returns a new card/log pair.
- No persistence: no localStorage, IndexedDB, server calls, or module-level card
  cache exists.
- Due ordering: both `dueCards()` and `ReviewQueue` sort due cards by due time
  then `CardId`.
- UTC-safe dates: the scheduler clones `Date` inputs and uses epoch
  millisecond arithmetic.
- Four ratings only: the exported `ReviewRating` union matches the contract.

## Kernel extensions

None.

## Tests

- `src/index.test.ts`

## How to run locally

```bash
pnpm -F @paideia/fsrs build
pnpm -F @paideia/fsrs test
```

## Anieyrudh Filter pass

Date: 2026-05-16
Filter version: aniegpt v1.0

### P0 issues

- Potential P0: scheduler nondeterminism from implicit wall-clock reads.
  Resolution: public functions accept `now`, tests replay identical inputs, and
  only default to `new Date()` when the caller omits `now`.
- Potential P0: queue could lie about due order. Resolution: `dueCards()` owns
  filtering and sorting, and `ReviewQueue` consumes that function directly.
- Potential P0: hidden persistence could make review state unauditable.
  Resolution: no storage APIs are imported or touched.

### P1 issues

- `core/shared/src/index.ts` does not currently export `CardId` despite
  `core/shared/AGENTS.md` listing it. Resolution: `@paideia/fsrs` exports its
  own `CardId` brand without modifying shared, preserving the requested write
  scope.
- The package avoids adding `ts-fsrs` until dependency installation and lockfile
  updates are explicitly allowed. The scheduler remains deterministic and keeps
  the public FSRS-shaped state boundary.

### High-bandwidth questions surfaced

- Should `CardId` be promoted into `@paideia/shared` in a future core change, or
  should review-card identity remain owned by `@paideia/fsrs`?

## Iteration log

- Implemented the card state transition as a pure kernel first.
- Added queue rendering after `dueCards()` sorting was covered by tests.
- Kept the module free of runtime dependencies beyond `@paideia/shared` and the
  React peer required by the declared queue component.
