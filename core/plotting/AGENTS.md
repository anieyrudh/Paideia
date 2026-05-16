# core/plotting · agent contract

## What this module is
The 2D mathematical plotting layer for the monorepo: function graphs, parametric curves, vector fields, and scatter overlays. It owns small React/SVG components for Tier 1 plotting; heavier Mafs or JSXGraph wrappers can be proposed later by ADR if a container needs richer dynamic geometry. It does not own statistical chart types, 3D scenes, or graph-network layouts; those have their own modules.

## Public interface
Exports from `@paideia/plotting`:

- `<FunctionPlot f={Function2D} domain={Interval} range?={Interval} samples?={number} overlays?={readonly Renderable<any>[]} />`
- `<ParametricPlot curve={ParametricCurve2D} t={Interval} samples?={number} />`
- `<VectorFieldPlot field={VectorField2D} region={Rect} density?={number} normalize?={boolean} />`
- `<ScatterPlot points={readonly [number, number][]} fit?={'linear' | 'none'} />`
- `<PlotFrame domain={Rect} grid?={'cartesian' | 'polar' | 'none'} aspect?={'equal' | 'auto'}>{children}</PlotFrame>`
- `<DraggablePoint constraint?={'free' | 'on-curve'} curve?={Function2D | ParametricCurve2D} initial={[number, number]} onMove={(p) => void} />`
- `<Tangent f={Function2D} at={number} length?={number} />`
- `<SecantLine f={Function2D} a={number} b={number} />`

## Invariants the caller must preserve
- All props are `Readonly<T>`. Components MUST NOT mutate props (no in-place sort of `points`, no domain widening behind the caller's back).
- `Function2D` passed in is treated as pure. If you need to memoise, do it before passing.
- Out-of-domain or undefined-at-point segments render as **gaps**, not as straight-line cheats. The renderer asks `evaluateAt` and skips on `err`.
- The renderer respects the declared `range`. It does not auto-fit silently; if you want fit, pass `range={undefined}` explicitly.

## What this module does NOT do
- Does **not** do statistics. Histograms, density plots, Sankey diagrams, time series — that's `core/charting`.
- Does **not** do 3D. Surfaces, 3D vector fields, parametric 3D — that's `core/three-scene`.
- Does **not** do force-directed graphs or trees — `core/graph-layout`.
- Does **not** compute derivatives or integrals — `<Tangent>` calls into `core/numerical-math`.
- Does **not** parse expressions — pass a `Function2D`. If you have a string, route through `core/function-eval` first.
- Does **not** persist view state (zoom, pan) — caller owns; component is controlled-ish but stateless on remount.
- Does **not** export to PNG/SVG file — that's a future export layer.

## When to consider this module
Use `core/plotting` whenever the visual is a 2D mathematical object — a function graph, a parametric curve, a planar vector field, a scatter of points, a tangent or secant overlay. If you are not plotting a function or curve in the Cartesian/polar plane, this is probably the wrong module.

## Extension protocol
1. Open a `core-change-proposal` issue naming every current consumer (every math/physics sim that plots in 2D).
2. Wait for both branches' CI green (`core-changed.yml`).
3. Use `core!:` commit prefix for any prop rename, default change, or rendering-correctness change.

## Anti-patterns (will be rejected in PR review)
- Connecting samples across an undefined-at-point with a straight line (the "vertical-asymptote-as-cliff" bug).
- Re-implementing plotting primitives in a sim package — extend this module instead.
- Mutating props (e.g. sorting `points` in place to draw a line).
- Reaching into the underlying library's imperative API from a consumer; expose the affordance here.
- Hard-coded colours/fonts — accept theme tokens.
- Branch-specific defaults (`if A-Level then bigger labels`) — accept a size prop and let the consumer choose.

## How the Anieyrudh Filter reads this module
The Filter probes that **the plotted curve matches the underlying function** at the resolution claimed, and that domain gaps are visible — no fake connectivity across `1/x` at the origin, no smoothed-over discontinuity. A plot that looks continuous where the math is not is a lie the Filter rejects.
