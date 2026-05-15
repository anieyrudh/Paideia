# core/algorithm-trace · agent contract

## What this module is
The instrumented-algorithm layer for computer-science teaching. It owns reference implementations of standard algorithms (sorts, searches, simple graph traversals) that emit a step-by-step trace of every comparison, swap, pointer move, and visited node — and a React visualiser that animates the trace. It is the canonical place CS algorithm visualisations are sourced so that two sims never disagree about, say, what bubble-sort does on the third pass.

## Public interface
Exports from `@paideia/algorithm-trace`:

- `TraceStep = { kind: 'compare' | 'swap' | 'set' | 'visit' | 'mark' | 'annotate'; at: readonly number[]; value?: number | string; note?: string }`
- `Trace<T> = { initial: readonly T[]; steps: readonly TraceStep[]; final: readonly T[]; meta: { algorithm: string; n: number; comparisons: number; swaps: number } }`
- `traceSort(arr: readonly number[], alg: 'bubble' | 'insertion' | 'selection' | 'merge' | 'quick' | 'heap'): KernelResult<Trace<number>>`
- `traceSearch(arr: readonly number[], target: number, alg: 'linear' | 'binary'): KernelResult<Trace<number>>` — `binary` requires sorted input or it returns `invalid-input`.
- `traceTraversal(graph: Graph, start: string, alg: 'bfs' | 'dfs'): KernelResult<Trace<string>>`
- `<TraceVisualizer trace={Trace<any>} speed?={number} onStep?={(i: number) => void} controls?={'full' | 'minimal' | 'none'} />`

## Invariants the caller must preserve
- Trace generation is **pure and deterministic**. Same input → same trace, every time.
- Algorithms MUST NOT mutate the input array. The input is read-only; `Trace.initial` is a copy.
- `at` indices in every step refer to positions in `initial` (or in `graph.nodes` for traversals); they are stable across the trace.
- The visualiser reads the trace; it does not re-run the algorithm. Editing a trace in flight is undefined behaviour.

## What this module does NOT do
- Does **not** teach correctness proofs or asymptotic analysis — content modules carry the prose.
- Does **not** cover advanced algorithms (Dijkstra, A*, dynamic programming, network flows). Those are future extensions, each with its own ADR.
- Does **not** profile real runtime. The `comparisons` and `swaps` counters are abstract operation counts, not wall-clock.
- Does **not** support student-supplied algorithm code — the algorithms here are fixed reference implementations; a future REPL module is a different concern.
- Does **not** animate at 60fps for huge `n` — recommended `n ≤ ~256` for the visualiser; larger traces are fine to compute but not to watch.

## When to consider this module
Use `core/algorithm-trace` when a sim needs to show, step by step, how a standard sorting, searching, or traversal algorithm proceeds on a given input. If you need a static figure rather than an animated trace, you can still use this module and skip the visualiser.

## Extension protocol
1. Open a `core-change-proposal` issue naming every current consumer (CS sims in both branches).
2. Wait for both branches' CI green (`core-changed.yml`).
3. Use `core!:` commit prefix for adding/changing algorithm semantics — a "bubble sort" that produces a different trace than before breaks pinned snapshots.

## Anti-patterns (will be rejected in PR review)
- Traces that mutate the input array.
- Algorithms whose output differs across runs for the same input (non-deterministic pivot without a seed).
- Trace step kinds that obscure the operation ("misc" instead of "compare" + "swap").
- Re-implementing a sort inside a sim instead of using `traceSort`.
- Branch-specific algorithm variants without an ADR.
- Visualiser that re-runs the algorithm on every render instead of consuming the cached trace.

## How the Anieyrudh Filter reads this module
The Filter probes that **the animation matches the algorithm's actual operations** — comparisons highlighted are real comparisons, swap counts equal the trace's swap steps, the final array equals what the algorithm would produce. A pretty animation that elides a swap to look smoother fails review.
