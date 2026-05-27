# @paideia/gene-regulatory-network Technical Notes

## Public Interface Summary

The package exports four branded numerics (`RateConstant`,
`MolarConcentration`, `RegulationFactor`, `HillCoefficient`), one literal type
(`RegulatorKind`), four record types (`Regulator`, `ExpressionState`,
`ExpressionParams`, `ExpressionDerivatives`), four validating constructors,
three regulator helpers (`hillActivate`, `hillRepress`, `applyRegulator`),
and three kinetics functions (`transcriptionRate`, `expressionDerivatives`,
`stepGeneExpression`).

All fallible operations return `KernelResult<T>` from `@paideia/shared`. No
public API uses `any`, mutates caller-owned inputs, renders UI, or stores
hidden global state.

## Invariant Enforcement

| Invariant | Enforcement |
|---|---|
| `RateConstant` and `MolarConcentration` are non-negative finite | Constructors enforce; every kinetics function re-validates at the boundary against forged brands. |
| `HillCoefficient` is strictly positive | Constructor + boundary re-validation in `hillActivate`, `hillRepress`. |
| `RegulationFactor` is in `[0, 1]` | Constructor enforces; Hill helpers clamp output before re-branding so a numerical overshoot cannot leak. |
| Hill helpers reject zero threshold | `requireStrictlyPositive` returns `out-of-domain`. |
| Hill helpers reject denominator collapse | Explicit `<= 0` guard returns `numerical-instability`. |
| `hillActivate(x) + hillRepress(x) = 1` at the same parameters | Property test asserts this within `1e-12`. |
| `transcriptionRate` requires `max >= basal` | Explicit guard in `requireParams` returns `out-of-domain`. |
| `stepGeneExpression` clamps mRNA and protein to `[0, ∞)` | Final `Math.max(0, ...)` after the Euler step, asserted by the high-decay test. |
| `dt` is finite and non-negative | Explicit checks return `precondition-violated` / `out-of-domain`. |
| All results stay finite | Every closed-form operation passes the raw number through `ensureFiniteResult` or an inline check. |

## Numerical / Algorithmic Method

The Hill function is computed with `Math.pow` and a single division. The
denominator-collapse and finiteness guards ensure the output is always a
clean `[0, 1]` `RegulationFactor`.

The mRNA + protein ODEs are

```text
dM/dt = α₀ + (α_max − α₀)·R − k_M·M
dP/dt = k_t·M − k_P·P
```

with one forward-Euler step per call:

```text
M_{t+dt} = max(0, M_t + dM/dt · dt)
P_{t+dt} = max(0, P_t + dP/dt · dt)
```

The non-negative clamp defeats tiny negative-Euler overshoots when a caller
picks a `dt` close to the stability limit. Sims that need adaptive or
implicit integration should consume `expressionDerivatives` and feed
`core/dynamical-systems` instead.

## Dependencies and License Status

| Dependency | Kind | Version | License | Notes |
|---|---|---|---|---|
| `@paideia/shared` | runtime | workspace | MIT (project) | Brings in `KernelResult`, `Brand`, `approxEqual`, `err`, `ok`. |
| `fast-check` | dev | `^3.23.2` | MIT | Property-test runner only (already in workspace). |
| `typescript` | dev | `^5.6.0` | Apache-2.0 | Compiler only. |
| `vitest` | dev | `^4.1.7` | MIT | Test runner only. |

No new third-party runtime dependencies. The Hill function and the
transcription-translation kinetics are scientific-literature facts.

## Test Strategy

- **Constructor coverage:** every constructor has happy-path and at least one
  rejection test.
- **Hill coverage:** zero-inducer / zero-repressor / inducer = threshold
  pinned values; monotonicity property; complementarity property
  (`activate + repress = 1`).
- **Regulator dispatch:** activator vs repressor; rejection of unknown kind.
- **Transcription rate:** basal vs max endpoints; linear-in-regulation
  property; `max < basal` rejection.
- **Derivatives:** literal-formula check; steady-state mRNA property
  (`dM/dt = 0`).
- **Step:** identity at `dt = 0`; non-negative clamp under aggressive decay;
  rejection of negative and non-finite `dt`; long-time convergence to the
  closed-form steady state.

## Anieyrudh Filter pass

Date: 2026-05-26
Filter version: aniegpt v1.0 (kernel author self-audit)

### P0 issues

- None observed. Public interface matches `AGENTS.md`: four branded
  numerics, one literal type, four records, four constructors, three
  regulator helpers, three kinetics functions. No `any` in any public
  signature. No exceptions thrown for expected validation failures. No
  organism-specific flags. No stochastic noise inside the deterministic
  step.

### P1 issues

- The forward-Euler step is intentionally simple; for stiff parameter
  combinations (very fast mRNA decay, very small `dt`) the negative-clamp
  hides instability rather than reports it. A future P2 could expose a
  `stabilityWarning` field. For introductory containers the clamp behaviour
  is more pedagogically useful.
- The boundary re-validation against forged brands adds ~50 lines and pays
  for itself in audit clarity (consistent with `core/cell-geometry` and
  `core/protein-structure`).

### P2 follow-ups (deferred)

- Add a `stepGeneExpressionRk4` (Runge-Kutta 4) variant once a container
  needs higher-order accuracy. Keep `stepGeneExpression` as the canonical
  introductory entry.
- Add `coupledGeneStep(nodes, edges, dt)` once a container needs to integrate
  a multi-node network. Today the same effect can be achieved by calling
  `stepGeneExpression` per node, recomputing each node's regulator after
  each step.
- Promote `MolarConcentration` to `core/shared` once a second kernel needs
  it (`core/signal-pathway` is the obvious next candidate; flagged for that
  PR to either reuse this brand or share via shared).

### High-bandwidth questions surfaced

- Should `MolarConcentration` live in `core/shared`? Today this kernel and
  `core/membrane-transport` both define their own concentration brand
  (mM vs µM). Promoting a unified `Concentration` brand to `core/shared`
  with explicit unit suffixes would deduplicate but requires an ADR; flagged.
- Should `RegulationFactor` exist as a separate brand, or should the API
  just accept `number` in `[0, 1]`? The brand prevents two common mistakes
  (passing a raw `RateConstant` or `MolarConcentration` by accident); kept.
