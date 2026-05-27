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

After syncing or rebasing onto `main`, run `pnpm install` before `pnpm typecheck`
or package tests. New workspace packages, such as `@paideia/shared-sims`, require
fresh workspace links even when no third-party dependency changed.

## Builder Rules

Each builder must:

- Read only the queue entry, `docs/container-spec.md`, `docs/agent-workflows.md`, relevant kernel READMEs/contracts, and the closest existing container pattern.
- Build at `repo.container_path` when that field is present. If it is missing, derive curriculum wrappers as `<branch>/content/<subject-or-pillar>/containers/<slug>/` and shared-core containers as `shared/content/<discipline>/containers/<slug>/`.
- Touch only the target container, the relevant package sim file/export, generated graph files, tests that must learn the new count/route, and the queue status for that entry.
- Use the `kernel_dependencies` list from the queue. If the list is wrong, update it in the same PR and explain why.
- Do not move a `shared.*` queue item into `a-level/` or `sutd/`. Build it under `shared/`, then let curriculum containers link to it later.
- Keep the learner UI student-facing. No package names, file paths, kernel names, or implementation commentary in the visible sim.
- Show every calculation with formula, substituted values, units, and interpretation.
- Show formulas as LaTeX code blocks with a nearby color-coded legend for every
  symbol. Keep formula colors aligned with controls, traces, vectors, and
  readouts. See [`simulation-presentation-standard.md`](./simulation-presentation-standard.md).
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

## Current Healthcare Wave

| Track | Queue id | Starting status | Required kernels |
| --- | --- | --- | --- |
| SUTD 10.019 | `sutd.10-019-science-and-technology-for-healthcare.cell-structure-and-the-membrane` | `ready-for-build` | `core/membrane-transport`, `core/cell-geometry`, `core/prediction-gate`, `core/ui-sim` |
| SUTD 10.019 | `sutd.10-019-science-and-technology-for-healthcare.protein-folding-and-function` | `ready-for-build` | `core/protein-structure`, `core/prediction-gate`, `core/ui-sim` |
| SUTD 10.019 | `sutd.10-019-science-and-technology-for-healthcare.gene-expression-dna-to-rna-to-protein` | `ready-for-build` | `core/gene-regulatory-network`, `core/sequence`, `core/prediction-gate`, `core/ui-sim` |
| SUTD 10.019 | `sutd.10-019-science-and-technology-for-healthcare.cell-signalling-pathways` | `ready-for-build` | `core/signal-pathway`, `core/dynamical-systems`, `core/prediction-gate`, `core/ui-sim` |
| SUTD 10.019 | `sutd.10-019-science-and-technology-for-healthcare.cell-cycle-and-mitosis-meiosis` | `ready-for-build` | `core/cell-cycle`, `core/prediction-gate`, `core/ui-sim` |
| SUTD 10.019 | `sutd.10-019-science-and-technology-for-healthcare.immune-system-and-vaccines` | `ready-for-build` | `core/immunology`, `core/dynamical-systems`, `core/prediction-gate`, `core/ui-sim` |
| SUTD 10.019 | `sutd.10-019-science-and-technology-for-healthcare.cancer-genetics-and-therapy` | `ready-for-build` | `core/oncogenetics`, `core/treatment-response`, `core/dynamical-systems`, `core/prediction-gate`, `core/ui-sim` |

Build these as separate PRs. If several are active at once, merge one, sync the others with `main`, regenerate graph, rerun full checks, then merge the next.

Healthcare simulations must be framed as concept models, not medical advice. Cite
biology sources carefully, avoid treatment recommendations, and keep
student-facing copy focused on mechanisms, assumptions, and limits.

## Completed Reserve Wave

These entries have already landed and remain here as a compact reference for
agents looking for nearby product-quality examples.

| Track | Queue id | Starting status | Required kernels |
| --- | --- | --- | --- |
| Shared probability | `shared.probability.bayes-updating` | `reviewed` | `core/probability-stats`, `core/charting`, `core/prediction-gate`, `core/ui-sim` |
| Shared probability | `shared.probability.central-limit-theorem` | `reviewed` | `core/probability-stats`, `core/charting`, `core/prediction-gate`, `core/ui-sim` |
| Shared math | `shared.linear-algebra.eigenvector-transformations` | `reviewed` | `core/sim-runtime`, `core/linear-algebra`, `core/plotting`, `core/prediction-gate`, `core/ui-sim` |
| Shared math | `shared.dynamical-systems.ode-phase-portrait` | `reviewed` | `core/sim-runtime`, `core/dynamical-systems`, `core/plotting`, `core/prediction-gate`, `core/ui-sim` |
| Shared optimisation | `shared.optimization.gradient-descent-landscape` | `reviewed` | `core/optimization`, `core/plotting`, `core/prediction-gate`, `core/ui-sim` |
| A-Level Physics | `alevel.physics.circuits` | `reviewed` | `core/sim-runtime`, `core/circuits`, `core/charting`, `core/prediction-gate`, `core/ui-sim` |
| A-Level Math | `alevel.math.probability-statistics` | `reviewed` | `core/sim-runtime`, `core/probability-stats`, `core/charting`, `core/prediction-gate`, `core/ui-sim` |

## Completed SUTD Wave

These SUTD curriculum-wrapper entries have landed and are useful exemplars for
curriculum-specific containers.

| Track | Queue id | Starting status | Required kernels |
| --- | --- | --- | --- |
| Freshmore probability | `sutd.freshmore.bayes-updating` | `reviewed` | `core/sim-runtime`, `core/probability-stats`, `core/charting`, `core/prediction-gate`, `core/ui-sim` |
| Freshmore linear algebra | `sutd.freshmore.eigenvector-transformations` | `reviewed` | `core/sim-runtime`, `core/linear-algebra`, `core/plotting`, `core/prediction-gate`, `core/ui-sim` |
| EPD control | `sutd.epd.bode-stability-margin` | `reviewed` | `core/sim-runtime`, `core/control-systems`, `core/charting`, `core/prediction-gate`, `core/ui-sim` |
| ESD stochastic optimisation | `sutd.esd.newsvendor-critical-fractile` | `reviewed` | `core/sim-runtime`, `core/probability-stats`, `core/optimization`, `core/charting`, `core/prediction-gate`, `core/ui-sim` |
| CSD algorithms | `sutd.csd.dynamic-programming-state-recursion` | `reviewed` | `core/sim-runtime`, `core/algorithm-trace`, `core/graph-layout`, `core/prediction-gate`, `core/ui-sim` |
| ASD environmental systems | `sutd.asd.shading-daylight-heat-gain` | `reviewed` | `core/sim-runtime`, `core/linear-algebra`, `core/charting`, `core/prediction-gate`, `core/ui-sim` |
| DAI human-centred AI | `sutd.dai.confusion-matrix-thresholds` | `reviewed` | `core/sim-runtime`, `core/probability-stats`, `core/charting`, `core/annotation`, `core/prediction-gate`, `core/ui-sim` |
| SMT modelling | `sutd.smt.linear-system-stability` | `reviewed` | `core/sim-runtime`, `core/dynamical-systems`, `core/linear-algebra`, `core/plotting`, `core/prediction-gate`, `core/ui-sim` |

## Next Kernel Reserve Wave

Do not build these kernels unless a concrete queue row needs them. When assigned,
use the one-kernel-per-PR workflow in `docs/agents/kernel-wave-runbook.md`.

| Domain | Kernel candidates | Trigger |
| --- | --- | --- |
| ML | `core/ml-basics`, `core/regression`, `core/classification` | Broader ML model-training or decision-boundary containers |
| Fairness | `core/fairness-metrics` | DAI fairness containers beyond confusion-threshold visualisation |
| SQL | `core/sql-lab` or `core/query-engine` | SQL parsing/execution rows |
| Operations | `core/inventory-models` | Supply-chain and inventory optimisation rows |
| Chemistry | `core/reaction-kinetics`, `core/equilibrium` | Advanced chemistry rows that exceed existing `core/chemistry` |
| Physics media | `core/optics`, `core/acoustics` | Optics or acoustics rows that exceed `core/waves` |
| Architecture | `core/daylight-geometry`, `core/spatial-analysis` | ASD daylight/spatial-analysis rows |
