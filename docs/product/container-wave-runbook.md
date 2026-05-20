# Container Wave Runbook

This runbook is the operating rule for building many Paideia containers without turning the repository into one large unreviewable change.

## Principle

One agent owns one container, one branch, and one pull request.

Do not batch unrelated containers into one PR. Parallelism comes from multiple clean branches, not from one large mixed diff.

## Queue Status Discipline

The source of truth is [`container-build-queue.yaml`](./container-build-queue.yaml).

Use these statuses consistently:

| Status | Meaning | Who changes it |
| --- | --- | --- |
| `planned` | Candidate exists, but it is not assigned yet. | Maintainer or roadmap owner |
| `ready-for-build` | Sources, kernels, target path, and scope are clear enough for an agent to claim. | Maintainer or wave coordinator |
| `in-build` | Exactly one branch/PR is actively building this container. | Builder when branch starts |
| `reviewed` | Container PR landed with validation, graph, route/sim tests, and Filter pass. | Merger after PR lands |
| `blocked` | Needs a kernel, source decision, clean-room process, or design decision. | Builder or reviewer |
| `deferred` | Not part of the current wave. | Maintainer or roadmap owner |

Do not let two agents claim the same `ready-for-build` entry. If two attempts exist, close one or make it explicitly experimental before either reaches review.

## Wave Coordinator Loop

1. Start from synced `main`.
2. Pick only entries marked `ready-for-build`.
3. Assign each entry to one branch using:

   ```text
   codex/container/<queue-id-as-kebab>
   ```

4. Immediately update that entry to `in-build` on the builder branch.
5. Build the container using the product-quality prompt in [`docs/agent-workflows.md`](../agent-workflows.md).
6. Run all required checks locally.
7. Open one PR.
8. Wait for CI and review.
9. If green, squash merge.
10. Sync `main`, regenerate graph if needed, and mark the entry `reviewed` in the merged PR.

If a PR fails because the concept needs missing shared logic, stop the container PR and open a kernel or clean-room issue. Do not hide reusable math inside the container.

## Builder Rules

Each builder must:

- Read only the queue entry, `docs/container-spec.md`, `docs/agent-workflows.md`, relevant kernel READMEs/contracts, and the closest existing container pattern.
- Build at `repo.container_path` when that field is present. If it is missing, derive curriculum wrappers as `<branch>/content/<subject-or-pillar>/containers/<slug>/` and shared-core containers as `shared/content/<discipline>/containers/<slug>/`.
- Touch only the target container, the relevant package sim file/export, generated graph files, tests that must learn the new count/route, and the queue status for that entry.
- Use the `kernel_dependencies` list from the queue. If the list is wrong, update it in the same PR and explain why.
- Do not move a `shared.*` queue item into `a-level/` or `sutd/`. Build it under `shared/`, then let curriculum containers link to it later.
- Keep the learner UI student-facing. No package names, file paths, kernel names, or implementation commentary in the visible sim.
- Show every calculation with formula, substituted values, units, and interpretation.
- Add Playwright coverage for prediction-gate blocking, at least one manipulation changing visible state, and revealed-state critical axe scan.

## Required Checks

Run before opening the PR:

```bash
pnpm container:validate <container-path>
pnpm container:docs <container-path>
pnpm graph:generate
pnpm graph:check
pnpm typecheck
pnpm lint
pnpm test
pnpm boundary
pnpm license:check
pnpm roadmap:validate
pnpm agent:validate
```

Playwright tests may need local-server permission in sandboxed environments.

## Reviewer Gate

Reviewers should lead with P0/P1 findings:

- P0: broken container shape, broken prediction gate, CI failure, license issue, cross-branch import, copied/incompatible source, or local reusable math that belongs in `core/`.
- P1: weak student-facing explanation, missing formula substitution, shallow test coverage, unclear source support, or stale generated graph data.
- P2: polish and future-product suggestions.

Merge only when P0 is zero and P1 is resolved or explicitly deferred in `TECHNICAL.md`.

## Current Four-Track Wave

| Track | Queue id | Starting status | Required kernels |
| --- | --- | --- | --- |
| A-Level Physics | `alevel.physics.momentum` | `reviewed` | `core/sim-runtime`, `core/mechanics`, `core/charting`, `core/prediction-gate`, `core/ui-sim` |
| A-Level Physics | `alevel.physics.waves` | `ready-for-build` | `core/sim-runtime`, `core/function-eval`, `core/charting`, `core/prediction-gate`, `core/ui-sim` |
| Shared physics | `shared.physics.free-body-diagram-mechanics` | `reviewed` | `core/sim-runtime`, `core/mechanics`, `core/linear-algebra`, `core/prediction-gate`, `core/ui-sim` |
| Shared circuits | `shared.circuits.circuit-phasor-reasoning` | `ready-for-build` | `core/circuits`, `core/charting`, `core/prediction-gate`, `core/ui-sim` |

Build these as separate PRs. If several are active at once, merge one, sync the others with `main`, regenerate graph, rerun full checks, then merge the next.

## Next Reserve Wave

These entries are approved for assignment after the current four-track wave has active workers. They are still one-container-per-PR builds and must be claimed by exactly one branch before implementation starts.

| Track | Queue id | Starting status | Required kernels |
| --- | --- | --- | --- |
| Shared probability | `shared.probability.bayes-updating` | `ready-for-build` | `core/probability-stats`, `core/charting`, `core/prediction-gate`, `core/ui-sim` |
| Shared probability | `shared.probability.central-limit-theorem` | `ready-for-build` | `core/probability-stats`, `core/charting`, `core/prediction-gate`, `core/ui-sim` |
| Shared math | `shared.linear-algebra.eigenvector-transformations` | `ready-for-build` | `core/sim-runtime`, `core/linear-algebra`, `core/plotting`, `core/prediction-gate`, `core/ui-sim` |
| Shared math | `shared.dynamical-systems.ode-phase-portrait` | `ready-for-build` | `core/sim-runtime`, `core/dynamical-systems`, `core/plotting`, `core/prediction-gate`, `core/ui-sim` |
| Shared optimisation | `shared.optimization.gradient-descent-landscape` | `ready-for-build` | `core/optimization`, `core/plotting`, `core/prediction-gate`, `core/ui-sim` |
| A-Level Physics | `alevel.physics.circuits` | `ready-for-build` | `core/sim-runtime`, `core/circuits`, `core/charting`, `core/prediction-gate`, `core/ui-sim` |
| A-Level Math | `alevel.math.probability-statistics` | `ready-for-build` | `core/sim-runtime`, `core/probability-stats`, `core/charting`, `core/prediction-gate`, `core/ui-sim` |
