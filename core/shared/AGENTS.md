# core/shared · agent contract

## What this module is
The universal vocabulary: the type-level glue every other core module and every consumer speaks. Function and field signatures, geometric primitives, bounded-domain wrappers, the kernel result/error contract, the renderer interface, branded unit types, and id brands. This module is intentionally tiny and dependency-free; importing it costs nothing at runtime.

## Public interface
All exports under `@paideia/shared`:

**Function shapes**
- `Function2D = (x: number) => number`
- `Function3D = (x: number, y: number) => number`
- `VectorField2D = (x: number, y: number) => [number, number]`
- `VectorField3D = (x: number, y: number, z: number) => [number, number, number]`
- `ParametricCurve2D = (t: number) => [number, number]`
- `ParametricCurve3D = (t: number) => [number, number, number]`

**Domains**
- `Interval = { min: number; max: number }`
- `Rect = { x: Interval; y: Interval }`
- `Box3 = { x: Interval; y: Interval; z: Interval }`
- `Bounded<T, D> = { value: T; domain: D }`

**Kernel results**
- `KernelErrorCode = 'out-of-domain' | 'numerical-instability' | 'invalid-input' | 'undefined-at-point' | 'timeout' | 'unimplemented'`
- `KernelError = { code: KernelErrorCode; message: string; at?: unknown }`
- `KernelResult<T> = { ok: true; value: T } | { ok: false; err: KernelError }`
- `ok<T>(value: T): KernelResult<T>`
- `err(code, message, at?): KernelResult<never>`

**Rendering**
- `Renderable<P> = { id: string; props: Readonly<P> }`
- `Renderer<P> = (target: HTMLElement | SVGElement, r: Renderable<P>) => () => void` (returns cleanup)

**Branded numerics** (nominal types, runtime-equivalent to number)
- `Seconds`, `Metres`, `Kilograms`, `MetresPerSecond`, `MetresPerSecondSquared`, `Radians`, `Degrees`, `Kelvins`, `Newtons`, `NewtonsPerMetre`, `Joules`, `Watts`, `Hertz`, `Probability`
- Constructors: `seconds(n)`, `metres(n)`, … each `Probability(n)` clamps/validates `0 ≤ n ≤ 1`.

**Id brands**
- `ConceptId`, `PackageId`, `SimId`, `CardId`, `StudentId`, `SessionId` (branded strings).

## Invariants the caller must preserve
- Treat `Function2D` and friends as **pure**: same input → same output, no side effects, no captured mutable state.
- A function whose domain excludes some inputs MUST be wrapped (`Bounded`) or paired with a domain `Interval`; raw `Function2D` is assumed total over ℝ except for declared exceptions.
- Always check `KernelResult.ok` before reading `.value`. Never throw across a kernel boundary — return `err(...)`.
- Branded constructors are the only sanctioned way to mint a branded value; do not `as Seconds` cast.

## What this module does NOT do
- Does **not** compute. No derivatives, integrals, ODE steps, or unit conversions — those live in `core/numerical-math`, `core/function-eval`, and downstream physics modules.
- Does **not** render. `Renderer` is a shape; concrete renderers live in `core/plotting`, `core/charting`, `core/three-scene`, etc.
- Does **not** depend on React, the DOM, Node, or any runtime library. It is types + a handful of trivial constructors.
- Does **not** define content shapes (concept packages, sims) — that's `core/content-schema`.
- Does **not** carry semantic units beyond the brand (e.g. no conversion table) — conversion lives in a downstream units module if/when added.

## When to consider this module
Use `core/shared` any time you write a function signature, declare a domain, return a kernel result, or accept a value whose unit matters. If two modules need to agree on a type, that type belongs here.

## Extension protocol
1. Open a `core-change-proposal` issue naming every current consumer (effectively all of `core/*` and both branch catalogues).
2. Wait for both branches' CI green (`core-changed.yml`).
3. Use `core!:` commit prefix for any signature change; additive brand or kernel-error code is non-breaking but still requires the proposal.

## Anti-patterns (will be rejected in PR review)
- Adding runtime dependencies (`d3`, `mathjs`, `three`, React) — this module stays zero-dep.
- Re-exporting downstream types ("convenience re-export from `core/plotting`") — consumers import from the owning module.
- `KernelResult` variants with extra fields (`warn`, `partial`) — keep the ADT to two shapes.
- Casting (`x as Metres`) instead of using the constructor.

## How the Anieyrudh Filter reads this module
The Filter probes that **every public function in every downstream module declares its domain in `core/shared` terms** and that errors flow through `KernelResult` rather than thrown exceptions or sentinel `NaN`s. A module that silently returns `NaN` at a domain boundary is rejected.
