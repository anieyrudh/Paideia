# @paideia/cell-geometry Technical Notes

## Public Interface Summary

The package exports six branded numeric types (`Length`, `Area`, `Volume`,
`InverseLength`, `DiffusionCoefficient`, `DiffusionTime`), four input record
types and a `ShapeMetrics` output record, four validating constructors
(`length`, `area`, `volume`, `diffusionCoefficient`), three shape calculators
(`sphere`, `cylinder`, `slab`), the explicit `surfaceToVolumeRatio` helper,
and the Fick-style 3D `diffusionTimeEstimate`.

All operations that can fail return `KernelResult<T>` from `@paideia/shared`.
No public API uses `any`, mutates caller-owned inputs, renders UI, or stores
hidden global state.

## Invariant Enforcement

| Invariant | Enforcement |
|---|---|
| Lengths are strictly positive finite metres | `length` rejects zero, negatives, NaN, Infinity. `sphere`, `cylinder`, `slab`, and `diffusionTimeEstimate` re-validate the brand at the boundary. |
| Areas and volumes accept zero but reject negatives | `area` and `volume` constructors enforce both ends. `surfaceToVolumeRatio` re-validates against forged negative brands. |
| `surfaceToVolumeRatio` rejects zero volume | Explicit `<= 0` guard returns `out-of-domain` before division. |
| Diffusion coefficient is non-negative finite m²/s | `diffusionCoefficient` accepts zero (a fully blocked membrane). `diffusionTimeEstimate` additionally rejects zero `D` because the time is undefined there. |
| All results stay finite | Every closed-form operation passes the raw number through `ensureFiniteResult` → `numerical-instability` on `NaN` or `±∞`. |
| Shape formulas are the closed-form textbook ones | `sphere` uses `S = 4 π r²`, `V = (4/3) π r³`. `cylinder` uses closed (capped) cylinder `S = 2 π r (r + L)`, `V = π r² L`. `slab` uses rectangular `S = 2(t d + t w + d w)`, `V = t w d`. |
| Diffusion-time estimate uses the textbook 3D mean-square-displacement form | `t = L² / (6 D)`. Property test asserts quadratic scaling with `L`. |

## Numerical / Algorithmic Method

All calculations are closed-form scalar arithmetic with `Math.PI`, no
iteration, no convergence concerns. The 3D diffusion-time estimate
`<r²> = 6 D t` is the standard introductory-cell-biology form (e.g. Phillips
et al., *Physical Biology of the Cell*, 2nd ed., 2013). Sims that need the 1D
or 2D variant should divide by 3 or 1.5 at the call site; the kernel exposes
the most commonly cited form only to keep the public surface narrow.

## Dependencies and License Status

| Dependency | Kind | Version | License | Notes |
|---|---|---|---|---|
| `@paideia/shared` | runtime | workspace | MIT (project) | Brings in `KernelResult`, `Brand`, `approxEqual`, `err`, `ok`. |
| `fast-check` | dev | `^3.23.2` | MIT | Property-test runner only (already in workspace). |
| `typescript` | dev | `^5.6.0` | Apache-2.0 | Compiler only. |
| `vitest` | dev | `^4.1.7` | MIT | Test runner only. |

No new third-party runtime dependencies.

## Test Strategy

- **Constructor coverage:** every constructor has a happy-path and at least
  one rejection test for negatives / zero / non-finite where the contract
  forbids them.
- **Closed-form coverage:** every shape (`sphere`, `cylinder`, `slab`) has a
  unit test pinning the formula at a hand-checked input.
- **Property tests:**
  - sphere SA:V = 3/r for any positive radius;
  - cylinder SA:V → 2/r in the long-rod limit (within 0.05 % at L = 10⁶·r);
  - `surfaceToVolumeRatio(sphere.surfaceArea, sphere.volume)` matches the
    bundled value;
  - `diffusionTimeEstimate` scales quadratically with characteristic length
    for a fixed diffusion coefficient.
- **Error-code coverage:** every `KernelResult.err` code (`precondition-violated`,
  `out-of-domain`, `numerical-instability`) is exercised through the
  constructors or the operation-level guards (including forged brands).

## Anieyrudh Filter pass

Date: 2026-05-26
Filter version: aniegpt v1.0 (kernel author self-audit)

### P0 issues

- None observed. Public interface matches the contract in `AGENTS.md`: six
  branded numerics, four input record types plus `ShapeMetrics`, four
  constructors, three shape calculators, plus `surfaceToVolumeRatio` and
  `diffusionTimeEstimate`. No `any` in any public signature. No exceptions
  thrown for expected validation failures. No biological content sneaked
  into the kernel — there are no `mitochondrion`, `bacterium`, or
  `redBloodCell` presets; that responsibility lives at the container layer.

### P1 issues

- The defensive re-validation in `surfaceToVolumeRatio` and the shape
  calculators is unreachable through the public constructors but exists so a
  forged brand still produces a typed error rather than `NaN`/`Infinity`
  propagation. Cost is ~30 lines; benefit is audit clarity.
- The 3D-only diffusion convention is documented in `AGENTS.md` and exposed
  through the function name (`diffusionTimeEstimate`). A future agent may
  want explicit 1D / 2D variants once a container surfaces the need; not
  worth a `core-change-proposal` until then.

### P2 follow-ups (deferred)

- Add `ellipsoid({ a, b, c })` once a container needs anisotropic cells
  (red blood cell, sperm). The closed-form surface area is non-trivial; an
  ADR plus a small numerical integrator would be appropriate.
- Add `taperedCylinder({ r1, r2, length })` for axon / dendrite geometry once
  a container surfaces the need.
- Promote `Length`, `Area`, `Volume` to `core/shared` if more kernels need
  them (currently only `core/membrane-transport` overlaps via concentration,
  not directly with these). Today the local brands are fine.

### High-bandwidth questions surfaced

- Should `DiffusionCoefficient` and `DiffusionTime` migrate to a future
  `core/transport-physics` kernel that also owns Fick's first and second laws
  in their time-dependent form? The current placement is pragmatic — this
  kernel needs them for the estimate — but a transport kernel would be a
  better long-term home.
