# core/function-eval · agent contract

## What this module is
The safe boundary between a string expression a learner (or author) typed and a `Function2D` the rest of the system can call. It owns expression parsing, compilation, and evaluation; wraps `mathjs` (and a thin layer of Mathigon `fermat.js` for algebraic manipulation where useful); and guarantees that arbitrary user input cannot reach the JS dynamic-eval escape hatch, network, or filesystem.

## Public interface
Exports from `@paideia/function-eval`:

- `evaluate(expr: string, vars: Record<string, number>): KernelResult<number>` — one-shot evaluation.
- `compile(expr: string, freeVars: readonly string[]): KernelResult<Function2D | ((vars: Record<string, number>) => number)>` — returns a reusable function; single-free-var case returns `Function2D`.
- `safeFunction(fn: Function2D, domain: Interval): Function2D` — wraps a raw JS `Function2D` so that out-of-domain inputs and NaN/infinite outputs are converted to the kernel's domain-error contract at the call site (via `evaluateAt`).
- `evaluateAt(f: Function2D, x: number, domain?: Interval): KernelResult<number>`
- `allowedFunctions: readonly string[]` — the whitelist of built-ins exposed to user expressions (sin, cos, exp, ln, log, sqrt, abs, …).
- `parseExpression(expr: string): KernelResult<AstNode>` — for callers that want to inspect structure (e.g. for `core/numerical-math` symbolic derivative).

## Invariants the caller must preserve
- Evaluation is **pure**: no side effects, no observable state across calls. If you need memoisation, ask `compile` once and reuse.
- Inputs outside the declared domain produce `KernelResult.err('out-of-domain', …)`. Inputs where the function is undefined (e.g. `1/0`, `log(0)`) produce `err('undefined-at-point', …)`.
- Caller MUST pass `freeVars` to `compile` explicitly; identifiers not in `freeVars ∪ allowedFunctions` are a parse error.
- `safeFunction`'s `domain` is authoritative; the underlying `fn` is trusted only inside that interval.

## What this module does NOT do
- Does **not** do calculus (derivative, integral, Taylor) — that's `core/numerical-math`, which depends on this module.
- Does **not** render expressions. LaTeX rendering belongs to a downstream typesetting layer (KaTeX/MathLive in `core/ui-sim` or a future `core/typeset`).
- Does **not** support unrestricted JavaScript expressions. No member access, no function calls outside `allowedFunctions`, no `this`, no template strings.
- Does **not** know what an expression "means" pedagogically — it cannot tell you the function is a sine; ask the parsed AST.
- Does **not** cache across `compile` calls implicitly. Caller-owned caches only.
- Does **not** evaluate at array inputs (vectorisation) — call `compile` once and loop, or build it on top.

## When to consider this module
Use `core/function-eval` whenever a learner or author supplies a math expression as a string and the system needs to call it as a function — function plots, root finders, integrators, table-of-values widgets. If your input is already a `Function2D`, you do not need this module.

## Extension protocol
1. Open a `core-change-proposal` issue naming every current consumer (plotting, numerical-math, charting, sims that accept user input).
2. Wait for both branches' CI green (`core-changed.yml`).
3. Use `core!:` commit prefix for any change to the whitelist or error contract.

## Anti-patterns (will be rejected in PR review)
- Falling back to dynamic JS evaluation (`eval`, the `Function` constructor) "for performance".
- Silently coercing `NaN` to `0` or to the last valid value.
- Expanding `allowedFunctions` to "all of mathjs" without an ADR.
- Caching with a module-global `Map` whose key is the raw string — caller-supplied caches only.
- Throwing on bad input; always return a `KernelResult`.
- Branch-specific syntax (`if SUTD allow Σ shorthand`) — extend the grammar, then both branches use it.

## How the Anieyrudh Filter reads this module
The Filter probes that **a malicious or malformed expression cannot reach a Turing-complete escape hatch**, and that domain/undefined errors propagate as kernel results rather than as `NaN`s that infect downstream plots. A renderer that draws a line where the function is undefined is a bug rooted in this module's contract not being honoured.
