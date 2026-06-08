# core/charting · agent contract

## What this module is
The statistical and data-shape chart layer: line charts over time or index, histograms over a sample, density plots, Sankey flows. It owns small React/SVG renderers for Tier 1 charting; Observable Plot or D3 wrappers can be proposed later by ADR when a consumer needs richer chart grammar. It is the disciplined home for "draw a chart" so that sims and dashboards never reach for ad-hoc chart code.

## Public interface
Exports from `@paideia/charting`:

- `<LineChart data={readonly { x: number | Date; y: number; series?: string }[]} x?={AxisSpec} y?={AxisSpec} ariaLabel?={string} />`
- `<Histogram samples={readonly number[]} bins?={number | readonly number[]} density?={boolean} />`
- `<DensityPlot samples={readonly number[]} bandwidth?={number | 'silverman'} />`
- `<Sankey nodes={readonly SankeyNode[]} links={readonly SankeyLink[]} />`
- `<AxisSpec>` type: `{ label?: string; domain?: Interval; scale?: 'linear' | 'log' | 'time'; tickFormat?: (v: number) => string }`
- `<ChartFrame width?={number} height?={number} margin?={Margin} ariaLabel?={string}>{children}</ChartFrame>`

## Invariants the caller must preserve
- `data`, `samples`, `nodes`, `links` are read-only. The component must not sort, bin, or mutate in place.
- Time-axis data MUST use real `Date` objects or numeric Unix timestamps with `scale: 'time'`; do not pass formatted strings.
- The caller declares the scale; the component does not auto-pick `log` because values "look exponential".
- Tooltips (when shown) read from a cached binned/aggregated layer; do not recompute on every hover.

## What this module does NOT do
- Does **not** do mathematical function plots, parametric curves, vector fields — that's `core/plotting`.
- Does **not** do 3D — that's `core/three-scene`.
- Does **not** do graph/network layouts — `core/graph-layout`.
- Does **not** fit models (regression, smoothing) — pass pre-fitted curves, or call `core/numerical-math.linearRegression` upstream.
- Does **not** stream. Charts re-render on prop change; for high-frequency updates, the caller throttles or uses a canvas variant if/when added.
- Does **not** export images. No `toPng()`. That's a separate export layer.
- Does **not** localise number formats — pass a `tickFormat` if you need it.

## When to consider this module
Use `core/charting` for any quantitative chart over data: a histogram of student responses, a line chart of population over time, a density curve of a sampled distribution, a Sankey of cohort flows. If your data is samples or rows, this is the module. If it's a continuous function, use `core/plotting`.

## Extension protocol
1. Open a `core-change-proposal` issue naming every current consumer (data sims, dashboards, both branch catalogues).
2. Wait for both branches' CI green (`core-changed.yml`).
3. Use `core!:` commit prefix for any rendering or prop change that could shift a previously-pinned visual snapshot.

## Anti-patterns (will be rejected in PR review)
- Ad-hoc chart rendering inside a sim package — implement the affordance here.
- Tooltips that recompute the binning or KDE on every `mousemove` — cache the binned layer.
- Mutating `samples` in place to sort or trim.
- Auto-switching scale (linear → log) based on data shape without the caller asking.
- Truncating axes at zero "to make changes look bigger" — start where the caller asks.
- Branch-specific defaults (`if SUTD then dark theme`) — read theme tokens.

## How the Anieyrudh Filter reads this module
The Filter probes that **the chart cannot mislead about the magnitude or distribution of the data**: zero is shown when zero matters, axes do not lie, log scales are labelled as log, and a density plot is not passed off as a histogram. A chart whose visual encoding diverges from the data's actual shape fails review.
