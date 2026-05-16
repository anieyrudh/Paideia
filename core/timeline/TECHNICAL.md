# core/timeline · Technical Record

## Imports

| Module | Symbols |
| --- | --- |
| `@paideia/shared` | `Interval`, `KernelResult`, `ok`, `err` |

## Public interface

- `TimelineEvent`
- `TimelineSpan`
- `BranchingTimelineNode`
- `Timeline`
- `BranchingTimeline`
- `layoutTimeline`
- `LaidOutItem`

## Invariants

- Inputs are read-only and copied before sorting.
- `Date` values are converted through `getTime()`; numeric inputs are treated
  as Unix milliseconds.
- `TimelineSpan.from < TimelineSpan.to` is enforced by `layoutTimeline()`.
- Timeline spacing is linear against the chosen domain. No non-linear
  compression is applied.
- Branching timelines reject cycles before rendering links.

## Tests

- `src/layout.test.ts`

## How to run locally

```bash
pnpm -F @paideia/timeline build
pnpm -F @paideia/timeline test
```

## Anieyrudh Filter pass

Date: 2026-05-16
Filter version: aniegpt v1.0

### P0 issues

- Potential P0: visual time spacing lies about duration. Resolution:
  `layoutTimeline()` uses a single linear projection from milliseconds to SVG
  x-coordinates and tests assert chronological ordering.
- Potential P0: reverse spans render as positive bars. Resolution: spans with
  `from >= to` return a `precondition-violated` kernel error.

### P1 issues

- Branching layout is a deterministic first pass, not a general graph layout.
  This keeps it inside the timeline contract rather than duplicating
  `core/graph-layout`.

### High-bandwidth questions surfaced

- Should the next public change expose a tick formatter prop, or should
  containers keep date label rendering outside the core timeline for now?
