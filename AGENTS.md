# Paideia — Agent Map

This is the short agent map. Keep it small. For task-specific prompts and
tool-specific entrypoints, use `docs/agent-workflows.md`.

Open educational monorepo: MIT code + CC-BY-4.0 content, A-Level and SUTD branches, container-shaped delivery, local-first AI.

## Build commands

- `pnpm install` — install workspace
- `pnpm dev` — run dev servers
- `pnpm test` — vitest (all packages)
- `pnpm typecheck` — tsc -b
- `pnpm container:new` — scaffold a new lesson container
- `pnpm container:validate` — enforce container shape (BLOCKS MERGE on failure)
- `pnpm graph:check` — confirm generated shell data is fresh
- `pnpm agent:validate` — confirm agent-facing docs and skill mirrors are current

## Where to read next

- Container shape: `@docs/container-spec.md` (canonical layout; locked)
- Agent task router: `@docs/agent-workflows.md` (copy-paste prompts and entrypoint map)
- Schemas: `@core/content-schema/src/index.ts` (Zod, locked; ADR to change)
- Universal types and branded units: `@core/shared/src/index.ts`
- The Filter (critic, not author): `@core/aniegpt/aniegpt-system-prompt.md`
- Per-package contracts: the `AGENTS.md` inside the package you are touching is authoritative

## Hard rules

- TypeScript strict ALWAYS (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`); no `any` in public APIs.
- All schema validation goes through Zod (v3) in `core/content-schema`.
- No GPL deps bundled into runtime. Check `LICENSES.json` before adding a dep.
- Prediction gate is non-negotiable — every sim test asserts the gate blocks reveal.
- Cross-branch imports forbidden: `a-level/**` MUST NOT import from `sutd/**` and vice versa (dependency-cruiser enforces).
- Container shape is enforced by `pnpm container:validate`. Authors compose into the shape; they do not invent files.
- The Anieyrudh Filter is a critic, never an author. It blocks; it does not write content.
- PMOE-T loop (Predict → Manipulate → Observe → Explain → Transfer) runs at container level.
- Own the kernels via contracts: kernels live in `core/<kernel>/`; sims consume them, never inline math/physics.

## Commits — Conventional Commits with scope

- `feat(a-level): ...` — A-Level branch features
- `feat(sutd): ...` — SUTD branch features
- `feat(core): ...` / `fix(core): ...` — core packages
- `core!: ...` — BREAKING change in a core public API (requires ADR)
- `docs:`, `chore:`, `test:`, `refactor:` — as usual

## Hook expectations

- `PostFileEdit` on `**/*.{ts,tsx}` → typecheck the affected package.
- `PreCommit` → `pnpm lint && pnpm test && pnpm container:validate`.
- See `.claude/settings.json` for the canonical hook config.
