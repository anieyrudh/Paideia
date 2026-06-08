---
name: fix-issue
description: Fix a GitHub issue by writing a failing reproducer test first, implementing the fix, running tests, then opening a PR. Use when the user provides an issue number or URL ("fix #123", "address issue 47", "/fix-issue 12").
disable-model-invocation: false
---

# fix-issue

Test-first issue resolution. The discipline: a fix that has no failing test before it is applied has not earned its keep.

## When to invoke

- "fix #<n>"
- "address issue <n>"
- "/fix-issue <n>" or "/fix-issue <url>"

## Procedure

1. **Read the issue.**
   ```
   gh issue view <num> --json title,body,labels,assignees,comments
   ```
   Extract:
   - Title and body.
   - Acceptance criteria (look for a checklist, `## Acceptance`, or bullet list in the body).
   - Reproduction steps if provided.
   - Labels — note `bug`, `regression`, `p0`, `container-spec`, `core` etc. for scope.

2. **Locate the surface area.** Use `rg --files` and `rg` to find the files
   referenced by the issue. If the issue cites a container or sim, read
   `docs/container-spec.md`, the nearest `AGENTS.md`, and the target
   `container.yaml` first.

3. **Write a failing test that reproduces the bug.** Hand off to the `test-writer` agent if substantial; otherwise write inline. The test MUST fail BEFORE any source change. Run:
   ```
   pnpm --filter <pkg> test --run <new-test>
   ```
   Confirm it fails for the right reason — i.e., the assertion that encodes the acceptance criterion fails, not an unrelated import error.

4. **Implement the fix.** Smallest change that makes the failing test pass without breaking siblings. Respect:
   - Branch boundary (`a-level/` ⊥ `sutd/`).
   - No `any` in public APIs.
   - Zod at data boundaries.
   - Kernel ownership: math/physics changes go in `core/<kernel>`, not inline in a sim.

5. **Run the full affected test suite.**
   ```
   pnpm --filter <pkg> test --run
   pnpm --filter <pkg> typecheck
   ```
   If the touched code is in a container, also run:
   ```
   pnpm container:validate <container-path>
   ```

6. **Verify acceptance criteria.** Walk every bullet in the issue's acceptance list; for each, identify the test or check that demonstrates it. If a criterion has no test, write one before declaring done.

7. **Commit and open PR.**
   - Branch: `fix/<short-slug>-<issue-num>`.
   - Conventional commit: `fix(<scope>): <summary> (#<num>)`.
   - PR body: link the issue with `Closes #<num>`; list the failing-then-passing test paths; note any architectural decision.
   - Push and open:
     ```
     gh pr create --title "fix(<scope>): <summary>" --body "Closes #<num>\n\n<acceptance-walkthrough>"
     ```

## Refuse to do

- Do not implement the fix before the reproducing test exists and fails.
- Do not close acceptance criteria with "manual verification" if a test is feasible.
- Do not bypass `pnpm container:validate` for container-touching fixes.
- Do not amend hidden behavioural changes that aren't in the issue scope into the same PR.
