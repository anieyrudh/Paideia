# core/plotting · Technical Record

## Imports

| Module | Symbols |
| --- | --- |
| `@paideia/shared` | `Function2D`, `ParametricCurve2D`, `VectorField2D`, `Interval`, `Rect`, `Renderable`, `KernelResult`, `ok`, `err` |
| `@paideia/numerical-math` | `derivative`, `linearRegression` |
| `react` | `useMemo`, `useRef`, React event/types |

## Public interface

- `FunctionPlot`
- `ParametricPlot`
- `VectorFieldPlot`
- `ScatterPlot`
- `PlotFrame`
- `DraggablePoint`
- `Tangent`
- `SecantLine`

## Invariants

- Props are typed as readonly and all internal transforms allocate copied
  arrays.
- Function sampling routes through `evaluateAt()` and drops non-finite or
  thrown evaluations into separate SVG path segments.
- Declared ranges are respected. Out-of-range samples are gaps, not hidden
  connected cliffs.
- Scales are explicit linear mappings from caller-provided `Interval`/`Rect`
  values to SVG coordinates.

## Tests

- `src/sampling.test.ts`

## How to run locally

```bash
pnpm -F @paideia/plotting build
pnpm -F @paideia/plotting test
```

## Anieyrudh Filter pass

Date: 2026-05-16
Filter version: aniegpt v1.0

### P0 issues

- Potential P0: graph path connects across `undefined-at-point`. Resolution:
  `sampleFunction()` splits paths whenever evaluation throws, returns a
  non-finite number, or leaves the declared range; tests cover the `1/x`
  origin gap.
- Potential P0: renderer mutates caller points while fitting. Resolution:
  scatter fit routes through `core/numerical-math.linearRegression()` with
  copied coordinate tuples.
- P0 found in PR review: `Tangent` computed derivatives locally. Resolution:
  `Tangent` now calls `core/numerical-math.derivative()`.

### P1 issues

- Scatter regression no longer owns model fitting; plotting only converts the
  upstream regression result into SVG geometry.

### High-bandwidth questions surfaced

- Should plotting fail closed when `range` is omitted, or is explicit
  auto-range acceptable for early containers that only need inspection views?
