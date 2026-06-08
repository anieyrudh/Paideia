# core/numerical-math · agent contract

## What this module is
The deterministic numerical analysis kernel: derivatives, integrals, Taylor polynomials, Riemann sums, secant slopes, linear regression. It takes pure `Function2D`s (or arrays of points) and returns numbers — never visuals, never units, never UI state. It is the layer every calculus, regression, and approximation sim leans on so that no two sims disagree about what "the derivative at x" means.

## Public interface
Exports from `@paideia/numerical-math`:

- `derivative(f: Function2D, x: number, h?: number): KernelResult<number>` — central-difference; `h` defaults to a per-function adaptive step.
- `derivativeAt(f: Function2D, x: number, opts?: { order?: 1 | 2 | 4; h?: number }): KernelResult<number>` — Richardson-extrapolated variants.
- `secantSlope(f: Function2D, a: number, b: number): KernelResult<number>`
- `integral(f: Function2D, bounds: Interval, opts?: { method?: 'simpson' | 'trapezoid' | 'gauss-legendre'; n?: number }): KernelResult<number>`
- `riemannSum(f: Function2D, bounds: Interval, n: number, rule: 'left' | 'right' | 'midpoint'): KernelResult<number>`
- `taylor(f: Function2D, x0: number, n: number): KernelResult<Function2D>` — returns the degree-`n` Taylor polynomial as a callable.
- `linearRegression(points: readonly [number, number][]): KernelResult<{ m: number; b: number; r2: number }>`
- `numericalTolerance: { default: number; tight: number; loose: number }` — declared tolerances callers cite in tests.

## Invariants the caller must preserve
- All inputs are pure `Function2D`s. Stateful or side-effecting `f` is undefined behaviour.
- Reported tolerance is upper-bound: `|computed − true| ≤ tolerance` over the documented input range. Callers cite the tolerance constant when asserting against analytic answers.
- For `integral` / `riemannSum`, `bounds.min < bounds.max`; reverse intervals are an `invalid-input` error (the caller flips and negates).
- Discontinuities and singularities inside the interval are the caller's problem — split the interval and call again.

## What this module does NOT do
- Does **not** do symbolic math. No CAS, no simplification, no symbolic derivative — pair with `core/function-eval`'s AST if you need that.
- Does **not** solve ODEs/PDEs — that's a future `core/odes` module.
- Does **not** know about units. Inputs and outputs are unitless numbers; brand them in the caller.
- Does **not** render. No SVG, no canvas, no React.
- Does **not** memoise across calls with hidden global state. If you call `derivative(f, 0.3)` twice, it computes twice — caller-owned caches only.
- Does **not** auto-detect discontinuities or vertical asymptotes.
- Does **not** vectorise — pass scalars, loop in the caller, or compose with a downstream tabulator.

## When to consider this module
Use `core/numerical-math` when your sim needs to compute derivatives, integrals, secant/tangent slopes, Riemann sums, Taylor approximations, or simple regressions of a user-supplied function. If you are about to write a finite-difference formula by hand in a sim, stop and use this module.

## Extension protocol
1. Open a `core-change-proposal` issue naming every current consumer (every calculus sim, regression sims, plotting overlays that show derivatives).
2. Wait for both branches' CI green (`core-changed.yml`).
3. Use `core!:` commit prefix for any change to tolerance or method defaults that could shift previously-pinned test snapshots.

## Anti-patterns (will be rejected in PR review)
- Hidden global memoisation across calls without explicit cache.
- Returning `NaN` instead of `KernelResult.err(...)` at a singularity.
- Magic step sizes (`h = 1e-7`) without a comment grounding the choice.
- Calls that silently downgrade method when `n` is too small.
- Branch-specific tolerance (`if A-Level then looser`) — tolerance is a function of the method, not the audience.
- Mutating input arrays passed to `linearRegression`.

## How the Anieyrudh Filter reads this module
The Filter probes that **a sim's visual claim about a derivative, integral, or limit matches this module's number to within the declared tolerance**. A secant-to-tangent visualisation whose displayed slope diverges from `derivative(f, x)` beyond `numericalTolerance.default` is rejected — the visual cannot lie about the limit.
