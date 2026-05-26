# Kernel Wave Runbook

Use this when a build queue item is blocked by missing reusable domain logic in
`core/<kernel>/`.

The goal is one narrow kernel PR at a time. A kernel PR should make later
containers simpler; it should not build containers at the same time.

## Source Of Truth

Read these first:

- `AGENTS.md`
- `docs/agent-workflows.md`
- `.agents/skills/new-kernel/SKILL.md`
- `core/shared/src/index.ts`
- `core/content-schema/src/index.ts`
- `LICENSES.json`
- a nearby implemented kernel with similar shape

For queue-driven work, also read `docs/product/container-build-queue.yaml` and
find the `blocked_on_kernel_dependencies` field.

## If `core/<kernel>/AGENTS.md` Exists

Follow `.agents/skills/new-kernel/SKILL.md` exactly.

Do not widen the public API beyond the contract. If the contract is wrong or too
small, stop and open a small contract-change PR or issue rather than improvising
inside implementation code.

## If `core/<kernel>/AGENTS.md` Is Missing

Do not start by writing implementation code. First decide whether the kernel is
small enough to contract and implement in one PR.

Acceptable one-PR kernels:

- one bounded concept family
- deterministic local computation
- no external service
- no large data dependency
- public API can fit in a short `AGENTS.md`
- tests can cover the main invariants in Vitest

Too broad for one PR:

- a whole biology, chemistry, or engineering field
- multiple unrelated model families
- fuzzy content generation
- broad simulation authoring frameworks
- APIs that need curriculum-specific flags

When too broad, open a contract-only PR and stop.

## Contract-First Checklist

Create `core/<kernel>/AGENTS.md` with:

- purpose in one paragraph
- "When to consider this module"
- public interface, exact exported symbols and signatures
- invariants callers must preserve
- runtime error behavior using `KernelResult`
- anti-patterns
- does-not-do list
- dependency and license notes
- minimal examples

Keep names generic and curriculum-neutral. Do not mention A-Level, SUTD,
Freshmore, or course numbers in core APIs.

## Implementation Checklist

Package shape:

```text
core/<kernel>/
├── AGENTS.md
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts
│   └── index.test.ts
├── README.md
└── TECHNICAL.md
```

Rules:

- export exactly the public interface from `AGENTS.md`
- return `KernelResult` for runtime validation failures
- no `any` in public APIs
- no branch-specific flags
- no top-level side effects
- no silent error swallowing
- no runtime dependency unless its SPDX license is already allowed
- update root `tsconfig.json` references when adding a new package

Use existing kernels first for composition. For example, a biology pathway
kernel may use `core/dynamical-systems` for generic ODE stepping, but the
biology-specific pathway primitives still belong in the new kernel.

## Tests

Required:

- happy path for every public function
- edge cases and invalid input paths
- every `KernelResult.err` code the kernel can return
- property tests where mathematical invariants apply
- no tests that only assert smoke-level existence

Examples of useful properties:

- conservation or monotonicity where scientifically true
- identity behavior
- bounds and clipping behavior
- deterministic repeatability
- input immutability

## Documentation

`README.md` must show a small container-facing usage example.

`TECHNICAL.md` must include:

- public interface summary
- invariant enforcement table
- dependency/license notes
- test strategy
- non-empty `## Anieyrudh Filter pass`
- any P2 follow-ups

## Validation

Run:

```bash
pnpm install
pnpm -F @paideia/<kernel> build
pnpm -F @paideia/<kernel> test
pnpm typecheck
pnpm lint
pnpm boundary
pnpm license:check
pnpm agent:validate
```

If the kernel is created to unblock queue entries, also run:

```bash
pnpm roadmap:validate
```

## PR Rules

One kernel per PR.

Title:

```text
feat(core): <kernel> kernel
```

PR body must include:

- why this kernel exists
- queue IDs it unblocks
- public API summary
- dependencies and license status
- validation results
- what the docs made clear
- what was missing or confusing

Do not mark blocked containers as buildable in the same PR unless the kernel is
merged and the queue update is the only remaining change.
