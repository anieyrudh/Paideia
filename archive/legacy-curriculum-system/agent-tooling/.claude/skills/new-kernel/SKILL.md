---
name: new-kernel
description: Implement or extend one Paideia core kernel from its core/<module>/AGENTS.md contract. Use when the user says "new kernel", "finish core/<module>", "implement a core module", or asks for reusable math/rendering/runtime logic.
disable-model-invocation: false
---

# new-kernel

Builds one `core/<module>/` package from its contract. Kernels are shared by
all curricula, so the public interface is narrow, tested, and documented.

## When to invoke

- "implement core/<module>"
- "finish the <module> kernel"
- "add a reusable kernel for <domain>"
- "/new-kernel <module>"

## Required inputs

| Field | Example | Required |
|---|---|---|
| module | `probability-stats` | yes |
| package_name | `@paideia/probability-stats` | default from module |
| has_react | `yes`, `no`, `partial` | yes |
| wrapped_libraries | `none`, `d3-array`, `three` | yes |

## Procedure

1. Read only the target contract and shared references:
   - `core/<module>/AGENTS.md`
   - `core/shared/src/index.ts`
   - `core/content-schema/src/index.ts`
   - `core/prediction-gate/README.md` if reveal flow is involved
   - a nearby implemented package with similar shape

2. Confirm dependency licenses before adding runtime dependencies. The SPDX
   license must be allowed by `LICENSES.json`. If the dependency is GPL, AGPL,
   LGPL, SSPL, BUSL, or Commons-Clause, stop and surface the blocker.

3. Create the package:

   ```text
   core/<module>/
   ├── package.json
   ├── tsconfig.json
   ├── src/
   │   ├── index.ts
   │   └── index.test.ts
   ├── README.md
   └── TECHNICAL.md
   ```

   React modules may add `src/component.tsx` and component tests. Math modules
   should split pure kernels from rendering adapters.

4. Export exactly the symbols listed in `AGENTS.md` "Public interface". Do not
   widen the public API for convenience. If the contract is insufficient, stop
   and open a `core-change-proposal` issue.

5. Enforce every invariant by one of:
   - TypeScript types.
   - Runtime guards returning `KernelResult.err(...)`.
   - React runtime checks with clear errors.
   - Tests that prove the invariant.

6. Write tests:
   - happy path and edge cases for every public function
   - every `KernelResult.err` code the package can return
   - property tests where mathematical invariants apply
   - accessibility/keyboard tests for React UI primitives

7. Fill `README.md` with one usage example and `TECHNICAL.md` with:
   - public interface summary
   - invariant enforcement table
   - dependency/license notes
   - non-empty `## Anieyrudh Filter pass`

8. Run:

   ```bash
   pnpm -F @paideia/<module> build
   pnpm -F @paideia/<module> test
   pnpm typecheck
   pnpm lint
   pnpm boundary
   pnpm license:check
   ```

## Integration files

If this is a new package, update root `tsconfig.json` references after the
package builds in isolation. Keep the root change in the same PR so `pnpm
typecheck` covers the kernel.

## Refuse to do

- Do not edit another kernel to make your package easier.
- Do not add branch-specific flags or imports.
- Do not use `any` in public APIs.
- Do not silently catch errors.
- Do not add runtime dependencies that fail the license allowlist.
- Do not skip `TECHNICAL.md` or leave the Filter pass empty.
