# core/timeline · agent contract

## What this module is
Hand-rolled SVG timeline rendering for historical, scientific, and procedural sequences. It owns the data shape for events and spans, two React components (linear and branching), and the layout maths that converts (date, duration, lane) into screen coordinates. No external timeline dependency — the surface is small enough that owning it outright beats wrapping.

## Public interface
Exports from `@paideia/timeline`:

- `TimelineEvent = { id: string; at: Date | number; label: string; lane?: string; meta?: Record<string, unknown> }`
- `TimelineSpan = { id: string; from: Date | number; to: Date | number; label: string; lane?: string; meta?: Record<string, unknown> }`
- `BranchingTimelineNode = TimelineEvent & { parents?: readonly string[]; children?: readonly string[] }`
- `<Timeline events={readonly TimelineEvent[]} spans?={readonly TimelineSpan[]} domain?={Interval} lanes?={readonly string[]} onSelect?={(id) => void} />`
- `<BranchingTimeline nodes={readonly BranchingTimelineNode[]} onSelect?={(id) => void} />`
- `layoutTimeline(events, spans, opts): KernelResult<{ items: readonly LaidOutItem[]; width: number; height: number }>` — pure layout for testing and headless use.

## Invariants the caller must preserve
- Inputs are read-only. Sorting, lane-assignment, and overlap resolution happen internally without mutating input arrays.
- `at`, `from`, `to` are real `Date` objects or numeric Unix milliseconds — never pre-formatted strings.
- For `TimelineSpan`, `from < to`. Reverse spans are an `invalid-input` error.
- For `BranchingTimeline`, the parent/child graph MUST be acyclic; cycles are an `invalid-input` error from `layoutTimeline`.

## What this module does NOT do
- Does **not** do general node-link layout — `core/graph-layout`.
- Does **not** do statistical time-series charts — `core/charting` (`LineChart` with `scale: 'time'`).
- Does **not** do calendar UI (month grids, scheduling). Out of scope.
- Does **not** persist viewport state. Zoom/pan is caller-controlled if needed.
- Does **not** localise date formats — pass a `tickFormat` prop if you need one.
- Does **not** support gigantic event counts with virtualisation; the rendering scales to roughly a few thousand items, not millions.
- Does **not** know history-specific semantics (BCE/CE conversion, fuzzy "circa" dates) — encode in `meta` and render via the label.

## When to consider this module
Use `core/timeline` when the sim or page needs a horizontal chronology — events along a single arrow, parallel lanes (e.g. polities side by side), or a branching causal/genealogical structure. If you only need a chart of value vs. time, prefer `core/charting`.

## Extension protocol
1. Open a `core-change-proposal` issue naming every current consumer (history sims, biology speciation/phylogeny sims, project-timeline demos).
2. Wait for both branches' CI green (`core-changed.yml`).
3. Use `core!:` commit prefix for any change to the data shape or layout that shifts pinned visual snapshots.

## Anti-patterns (will be rejected in PR review)
- Pulling in a third-party timeline library to "save effort" — the contract is hand-rolled, deliberately.
- Auto-collapsing overlapping events without surfacing the collapse to the caller.
- Treating string years as numbers (`"1066"` → `1066`) without a documented parser.
- Branch-specific lane styling baked in — pass theme tokens.
- Mutating input arrays for lane resolution.

## How the Anieyrudh Filter reads this module
The Filter probes that **the visual spacing on the timeline is faithful to the underlying dates**: a 50-year span and a 500-year span are visually distinguishable at the chosen scale, and a non-linear axis is labelled as non-linear. A timeline that compresses or stretches time without saying so misleads the learner and fails review.
