# core/charting · Technical Record

## Imports

| Module | Symbols |
| --- | --- |
| `@paideia/shared` | `Interval` |
| `react` | React types |

## Public interface

- `LineChart`
- `Histogram`
- `DensityPlot`
- `Sankey`
- `ChartFrame`
- `AxisSpec`
- `Margin`
- `SankeyNode`
- `SankeyLink`

## Invariants

- Data arrays are never sorted or binned in place. Kernels allocate copied
  arrays for series ordering, histogram edges, and density points.
- Log scale is only used when `AxisSpec.scale === "log"` and positive domains
  are provided.
- Histograms and density plots are separate components so density curves are not
  passed off as binned counts.
- Axis domains come from caller specs when provided; otherwise defaults are
  deterministic linear bounds for a first renderer.

## Tests

- `src/kernels.test.ts`
- `src/components.test.tsx`

## How to run locally

```bash
pnpm -F @paideia/charting build
pnpm -F @paideia/charting test
```

## Anieyrudh Filter pass

Date: 2026-05-16
Filter version: aniegpt v1.0

### P0 issues

- Potential P0: visual encoding diverges from data via hidden mutation.
  Resolution: binning and sorting copy caller arrays; tests assert original
  arrays are unchanged.
- Potential P0: log axis applied without caller intent. Resolution:
  `projectValue()` defaults to linear and only applies log math for explicit
  `scale: "log"`.

### P1 issues

- Sankey layout is intentionally simple and deterministic. It is enough for
  Tier 1 flows but not a general crossing-minimising graph layout.
- PR review found two visual-truth bugs: line charts connected across rejected
  log-scale points, and negative Sankey values rendered as positive-width
  flows. Resolution: line paths split into gap-aware segments, and invalid
  Sankey link values render an error label instead of a flow.

### High-bandwidth questions surfaced

- Which first consumer needs chart tooltips? The contract requires cached
  tooltip data when added, but Tier 1 has no hover API yet.
