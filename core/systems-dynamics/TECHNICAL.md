# core/systems-dynamics · Technical Record

## Public Interface

`@paideia/systems-dynamics` exports branded system variable ids, stock, flow,
auxiliary, model, state, time-point, and simulation spec types plus helpers for
id construction, model validation, initial state, auxiliary evaluation, Euler
stepping, and fixed-step simulation.

The package is pure TypeScript. It does not render stock-flow diagrams, parse
equations, run stochastic models, persist telemetry, or import branch code.

## Invariant Enforcement

| Invariant | Enforcement |
|---|---|
| Variable ids are trimmed, whitespace-free, and not reserved object keys | `systemVariableId()` |
| Stock, flow, and auxiliary ids are unique | `validateSystemModel()` |
| Stock values and bounds are finite | `validateSystemModel()` |
| Stock bounds contain initial values | `validateStockBounds()` |
| Flows have a source or target | `validateFlow()` |
| Flow endpoints reference stocks | `validateFlow()` |
| Rate and auxiliary functions are deterministic and finite | `evaluateFunction()` |
| `dt` and `duration` are finite positive numbers | `validateSimulationSpec()` |
| Duration is an integer multiple of `dt` | `validateSimulationSpec()` |
| State has every stock and finite values | `validateState()` |
| Stock bounds are enforced after each step | `stepEuler()` |
| Inputs are not mutated | frozen callback-state copies and mutation regression test |

## Dependency and License Notes

Runtime dependencies:

- `@paideia/shared` via workspace dependency.

Dev-only dependencies:

- `fast-check`, `typescript`, and `vitest`, matching existing pure core
  packages.

No runtime ODE, parser, renderer, or stochastic simulation library is bundled.

## P2 Followups

- Add `core/systems-dynamics` to `docs/core-modules.md` as implemented during
  the next docs catalogue refresh.
- If a future container needs Runge-Kutta or adaptive integration, route through
  `core/dynamical-systems` instead of widening this fixed-step package.
- Add additional property suites for longer multi-step conservation and
  auxiliary-driven feedback models after the first consuming container lands.

## Anieyrudh Filter pass

Date: 2026-05-24
Filter version: aniegpt v1.0

### P0 issues

- Risk: missing state or invalid flows could be silently treated as zero,
  producing a false causal trajectory. Resolution: model and state validation
  reject missing stock values and invalid endpoints before simulation, and
  reserved object-key ids are rejected before state construction.
- Risk: callbacks could mutate caller state or shared per-step state. Resolution:
  rate and auxiliary callbacks receive frozen copies only; mutation attempts
  return `KernelResult.err(...)` and leave caller input unchanged.

### P1 issues

- Risk: bounds could be silently clamped, hiding model failure. Resolution:
  initial and stepped bounds are enforced with `KernelResult.err(...)`; only
  tiny roundoff at an exact bound is normalized.
- Risk: auxiliary-bearing simulations could omit auxiliary values from time
  points. Resolution: `simulateSystem()` evaluates auxiliaries at each point,
  and `stepEuler()` allows flows to depend on declared auxiliary state.
- Risk: stochastic callbacks could masquerade as deterministic dynamics.
  Resolution: callbacks are evaluated twice against frozen copies for the same
  state and time; divergent values are rejected.

### High-bandwidth questions surfaced

- Future container specs should decide whether learners need visible flow
  contribution traces per step in addition to stock time series.

## Iteration log

- Kept this package fixed-step and deterministic.
- Rejected string equation parsing and diagram rendering from the v0 scope.
- Added property coverage for monotonicity under constant positive inflow and
  conservation across a one-step internal transfer.
