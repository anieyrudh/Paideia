# @paideia/membrane-transport Technical Notes

## Public Interface Summary

The package exports five branded numeric types (`Concentration`,
`Permeability`, `Flux`, `IonCharge`, `Volts`), four input record types
(`MonovalentIon`, `NernstInput`, `GoldmanInput`, `MembraneFluxInput`), four
physical constants (`GAS_CONSTANT`, `FARADAY_CONSTANT`,
`BODY_TEMPERATURE_KELVIN`, `ROOM_TEMPERATURE_KELVIN`), five validating
constructors (`concentration`, `permeability`, `ionCharge`, `volts`, `flux`),
and three biophysical operations: `nernstPotential` (single-ion equilibrium
potential), `goldmanVoltage` (resting membrane potential for monovalent ions),
and `membraneFlux` (Fick's first-law steady flux).

All operations that can fail return `KernelResult<T>` from `@paideia/shared`.
No public API uses `any`, mutates caller-owned inputs, renders UI, or stores
hidden global state.

## Invariant Enforcement

| Invariant | Enforcement |
|---|---|
| Concentrations are strictly positive finite mM | `concentration` rejects zero, negatives, NaN, and Infinity; all three biophysical operations re-validate at the boundary so a forged brand still produces `out-of-domain`. |
| Permeabilities are non-negative finite m/s | `permeability` rejects negatives and non-finite values; `goldmanVoltage` and `membraneFlux` re-validate at the boundary. |
| `IonCharge` is a non-zero integer | `ionCharge` rejects zero and non-integers; `nernstPotential` re-validates so a forged brand still produces `out-of-domain`. |
| Temperatures are strictly positive in kelvins | Internal `requireTemperature` checks both finiteness and `> 0`. |
| `goldmanVoltage` accepts only monovalent ions (`+/-1`) | Type narrows to `-1 | 1` at compile time; runtime check on each entry returns `out-of-domain` for any other charge to defeat brand forgery. |
| At least one positive permeability is required for GHK | Walks the ion list; returns `precondition-violated` otherwise. |
| GHK numerator and denominator stay strictly positive | Both are accumulated from non-negative permeabilities and positive concentrations; the result is re-validated against `<= 0` to surface `numerical-instability` if the inputs conspire (e.g. all anions on one side). |
| All results stay finite | Every public function passes its raw `number` through `ensureFiniteResult` and returns `numerical-instability` on `NaN` or `+/-Infinity`. |
| Mathematical identities are stable | Property tests cover `E_+1 = -E_-1` for the Nernst antisymmetry under charge sign flip, GHK reduces to Nernst for a single ion (both cation and anion cases), and `membraneFlux` scales linearly in permeability. |

## Numerical Method

For an ion of charge `z` at absolute temperature `T` with bath concentrations
`C_out` and `C_in`, the Nernst equilibrium potential is

```text
E = (R * T) / (z * F) * ln(C_out / C_in)
```

For a set of monovalent ions, the Goldman-Hodgkin-Katz voltage equation gives
the resting membrane potential as

```text
V_m = (R * T / F) * ln(
  ( sum_cations P_i * [cation_i]_out  +  sum_anions  P_j * [anion_j]_in  )
  / ( sum_cations P_i * [cation_i]_in   +  sum_anions  P_j * [anion_j]_out )
)
```

The anion terms appear with inside / outside swapped because of the negative
charge sign; this is the standard textbook convention (Hille, *Ionic Channels
of Excitable Membranes*, 3rd ed.). The implementation expresses this directly
without inflating the public API.

For a membrane with permeability `P` and bath concentrations `C_out`, `C_in`,
Fick's first-law steady flux is

```text
J = P * (C_out - C_in)
```

Sign convention: positive `J` is outside-to-inside transport. Units cancel to
`m/s * mol/m^3 = mol/(m^2 s)`, which is what the `Flux` brand encodes.

## Dependencies and License Status

| Dependency | Kind | Version | License | Notes |
|---|---|---|---|---|
| `@paideia/shared` | runtime | workspace | MIT (project) | Brings in `KernelResult`, `Brand`, `Kelvins`, `kelvins`, `approxEqual`, `err`, `ok`. |
| `fast-check` | dev | `^3.23.2` | MIT | Property-test runner only (already present in workspace). |
| `typescript` | dev | `^5.6.0` | Apache-2.0 | Compiler only. |
| `vitest` | dev | `^4.1.7` | MIT | Test runner only. |

No new third-party runtime dependencies. `pnpm license:check` continues to
report the existing production dependencies as compatible.

## Anieyrudh Filter pass

Date: 2026-05-26
Filter version: aniegpt v1.0 (kernel author self-audit)

### P0 issues

- None observed. Public interface matches the contract in `AGENTS.md`: five
  branded numerics, four input record types, four physical constants, five
  constructors, three biophysical operations. No `any` in any public
  signature. No exceptions thrown for expected validation failures; every
  fallible operation returns `KernelResult<T>`. Both the Nernst and GHK
  formulas are written directly against `Math.log`; no third-party
  electrochemistry library introduced. The GHK anion convention is the
  textbook one (Hille; Aidley & Stanfield) and is asserted by the property
  test "with Cl alone, reduces to the Nernst potential for Cl".

### P1 issues

- The defensive branches inside `requireTemperature`,
  `requirePositiveConcentration`, `requireNonNegativePermeability`, and
  `requireIntegerCharge` are unreachable through the public constructors but
  guard against forged brands. They cost about 60 lines but pay for themselves
  in audit clarity — the goldman / nernst / flux entry points cannot be
  smuggled invalid inputs even if a downstream consumer bypasses the
  constructors. The same property tests exercise both paths.
- The kernel does not yet expose a multi-valent GHK generalisation. That is
  deliberate — the contract excludes it — but a future container on calcium
  signalling will likely need it. Recorded as a P2 below so the next agent
  can pick it up without re-deriving the contract.

### P2 issues (deferred)

- A multi-valent GHK form (Pickard / Mullins-Noda) for Ca2+ and Mg2+ heavy
  containers. Requires a numerical root finder; out of scope here.
- A time-dependent Nernst-Planck flux for sims that want to show the bath
  approaching equilibrium dynamically. Belongs in a separate kernel that
  consumes this one and `core/dynamical-systems` for the ODE integration.
- A unit-aware `concentration` constructor that accepts µM, M, or
  mmol/L explicitly. The current API standardises on mM (which equals mol/m^3
  numerically), keeping the public surface small.

### High-bandwidth questions surfaced

- Should `Volts` migrate to `@paideia/shared` as a top-level branded unit so
  every kernel that produces a voltage (this one, circuits, electromagnetism)
  speaks the same brand? Worth a `core-change-proposal` issue.
- Should the GHK convention be configurable (anion-positive vs.
  cation-positive sign), or is the textbook outside-to-inside positive flux
  pinned forever? Current call: pinned, with an explicit invariant.
