# Scalars and Vectors · Technical Record

## Imports

- `@paideia/prediction-gate`
  - `PredictionGate` gates the `resultant-magnitude` observation until the
    package-level prediction is committed.
- `@paideia/content-schema`
  - `TPredictSpec` types the duplicated package predict spec in the executable
    sim package.
- `react`
  - `useMemo`, `useState` drive the local control state for this first vertical
    slice.

## SimulationSpec (frozen)

```yaml
id: resultant-magnitude
title: "Resultant Magnitude Explorer"
interaction_type: diagram-builder
kernel_deps:
  - core/prediction-gate

predict:
  prompt: |
    Two displacement arrows each have length 5 m. One points east and one points north. Before seeing any construction, what resultant magnitude do you expect?
  commit_format:
    kind: multiple-choice
    options:
      - "0 m"
      - "5 m"
      - "7.1 m"
      - "10 m"
    correct_index: 2
  rationale_required: true

manipulate:
  controls:
    - id: vector-a-magnitude
      label: "Vector A magnitude"
      kind: slider
      kernel_binding: state.vectorA.magnitude
      bounds: { min: 0, max: 10, step: 0.5 }
    - id: vector-b-magnitude
      label: "Vector B magnitude"
      kind: slider
      kernel_binding: state.vectorB.magnitude
      bounds: { min: 0, max: 10, step: 0.5 }
    - id: angle-between
      label: "Angle between vectors"
      kind: slider
      kernel_binding: state.angleDegrees
      bounds: { min: 0, max: 180, step: 5 }

observe:
  renderers:
    - id: resultant-vector-diagram
      module: "@paideia/a-level-physics-sims/resultant-magnitude"
      symbol: ResultantVectorDiagram
      props_binding: |
        Draw vector A east, vector B at the selected angle, and the geometric resultant from their component sum.

explain:
  prompt: |
    Why does changing only the angle between two vectors change the resultant magnitude even when both vector lengths stay fixed?
  socratic: true
  expected_misconceptions_surfaced:
    - "Magnitude-only vector addition"
```

## Kernel extensions

None. The sim uses a local two-vector component sum because no shared
`core/vector-math` kernel exists yet. If more containers need vector operations,
promote this behavior through a `core-change-proposal`.

## Accessibility

- Prediction gate uses labelled radio controls and a labelled rationale field.
- Sim controls are labelled range inputs.
- The SVG diagram has `role="img"` and an accessible label.
- Axe summary: pending. There is no branch learner app route or Playwright/axe
  harness yet, so this PR documents the gap and relies on labelled native
  controls plus jsdom regression coverage until the app shell exists.

## Tests

- Container validation: `pnpm container:validate`
- Sim harness: `pnpm -F @paideia/a-level-physics-sims test`
- Executable prediction gate regression:
  `a-level/packages/physics-sims/src/resultant-magnitude.test.ts`
- Route-level prediction-gate contract:
  `simulation/simulation.test.ts`
- Generic browser harness:
  `testing/sim-harness`

Latest local gate run on 2026-05-16:

- `pnpm -F @paideia/a-level-physics-sims build` passed.
- `pnpm -F @paideia/a-level-physics-sims test` passed.
- `pnpm -F @paideia/sim-harness test` passed.
- `pnpm typecheck` passed.
- `pnpm test` passed.
- `pnpm lint` passed.
- `pnpm boundary` passed.
- `pnpm license:check` passed.
- `pnpm container:validate` passed.

## How to run locally

```bash
pnpm container:validate
pnpm -F @paideia/a-level-physics-sims test
```

## Anieyrudh Filter pass

Date: 2026-05-15
Filter version: aniegpt v1.0

### P0 issues

- Potential P0: content package without a prediction gate. Resolution: package
  includes `package_predict`; the `resultant-magnitude` sim wraps observation
  inside `PredictionGate`, and the sim test asserts reveal is blocked before
  commit.
- Potential P0: weak sourcing. Resolution: syllabus alignment cites the current
  SEAB 2027 H2 Physics 9478 syllabus, and misconception claims cite PER/OpenStax
  sources.
- Potential P0: sim not runnable through repository tests. Resolution:
  `@paideia/a-level-physics-sims` imports the container sim and runs a jsdom
  React test in `pnpm -r test`.
- Resolved P0 under strict doctrine: `simulation/simulation.test.ts` now imports
  the generic browser contract from `testing/sim-harness` and runs through
  Playwright/Chromium as part of `pnpm test`.

### P1 issues

- P1: No branch app route exists yet for product navigation. Resolution:
  `testing/sim-harness` provides a generic browser mount for all sims, so
  Playwright coverage no longer depends on the future learner app route.
- P1: Sim-level Predict metadata was initially missing because the container
  used `package_predict`. Resolution: duplicated the prediction spec into
  `simulation.yaml` and `simulation.predict`, and set `predict_at: both`
  so the package and sim records are explicit.
- P1: The first UI copy explained the mechanism too early. Resolution: replaced
  it with a Socratic observation prompt so the explain step remains student-authored.
- P1: Transfer was initially described but not represented as an artifact.
  Resolution: added `problem-solving/field-trip-displacement.md` and linked it from
  `items.transfer_problems`.
- P1: Vector addition is local to this sim. Resolution: acceptable for the first
  concept-specific vertical slice; promote to `core/vector-math` only when a
  second container needs the same behavior.

### High-bandwidth questions surfaced

- Should the first browser app route live under `a-level/apps/learner` or a
  package-agnostic `apps/learner` shell?
- Should vector operations become a Tier 1.5 `core/vector-math` kernel before
  force, velocity, and momentum containers reuse the behavior?

## Failure log

Date: 2026-05-16

| Attempt | Failed where | Symptom | Resolution |
| --- | --- | --- | --- |
| Use `core/docs-templates/sim-index.template.tsx` directly | Sim scaffold review | Template imports `@paideia/sim-runtime`, but `core/sim-runtime` is currently only a contract, not an implemented package | Built the first sim directly against the real `@paideia/prediction-gate` package and documented the missing runtime as a product gap |
| Add Playwright test immediately | Test planning | The repo has no branch app route or Playwright dependency/config yet | Added a jsdom React regression test in `@paideia/a-level-physics-sims`; left Playwright route work as the next product PR |
| Put vector addition in `core/` immediately | Kernel planning | No existing `core/vector-math` contract exists, and adding one would widen scope beyond the first vertical slice | Kept two-vector component math local and documented a promotion trigger |
| Refresh lockfile for the new harness package | Local validation | `pnpm install --lockfile-only` hit sandboxed DNS `ENOTFOUND` retries for npm registry metadata before completing | Keep this in the record; future agents should request network escalation immediately if lockfile refresh stalls on registry DNS |
| Run first sim harness test | `pnpm -F @paideia/a-level-physics-sims test` | Vitest found no test files when targeting content tests from the package, then repo-root execution could not resolve package-level `react` | Moved the executable jsdom regression into `a-level/packages/physics-sims/src/` and kept the container test file as the route-level Playwright contract marker |
| Restore workspace links for new package | `CI=true pnpm install --offline` | Offline install removed `node_modules` and failed because the pnpm store lacked `acorn-jsx` | Rerun install with network access; do not rely on offline install after adding a workspace package |
| Install narrow sim harness offline | `pnpm install --offline --filter @paideia/a-level-physics-sims` | The local pnpm store lacked `@testing-library/react` | Replaced the harness test with plain `react-dom` + DOM events so the new package has fewer local tarball requirements |
| Typecheck content sim directly from package | `pnpm typecheck` | The content sim file sat outside the package root and could not resolve package-local `react`, `@paideia/prediction-gate`, or JSX runtime types | Moved executable TSX to `a-level/packages/physics-sims/src/resultant-magnitude.tsx` and left the content sim entry as a thin route-facing re-export |
| Exercise React-controlled inputs without Testing Library | `pnpm -F @paideia/a-level-physics-sims test` | Native DOM assignment did not update React-tracked textarea state, so the prediction gate did not reveal after commit | Updated the test helper to use the native value setter and wrapped interactions in React `act`; the prediction-gate regression now passes |
| Pedagogy review | `pedagogy-reviewer` subagent | Blocked merge because transfer was absent and `simulation/simulation.test.ts` was a comment-only placeholder | Added a transfer artifact and converted the required sim test file into an executable jsdom contract that asserts the prediction gate blocks observation until commit |
| Pedagogy recheck | `pedagogy-reviewer` subagent | Strict doctrine still wants Playwright in the sim test file, not jsdom | Added `testing/sim-harness`, changed the content-level sim test to import a Playwright contract, and wired Chromium installation into CI before `pnpm test` |

## Iteration log

- Selected a small A-Level Physics foundation concept aligned to the current
  SEAB 9478 syllabus.
- Added `simulation/` as the first observation-shaped sim.
- Added `a-level/packages/physics-sims` so content sims are exercised by the
  workspace test runner.
- Rejected using the old scaffold template as-is because it points at missing
  runtime infrastructure.
