# Resolving Vectors · Technical Record

## Imports

- `@paideia/linear-algebra`
  - `vector2`, `matrix2`, `multiplyMatrixVector2`, and `norm2` own finite
    vector construction, rotation, component extraction, and magnitude checks.
- `@paideia/shared`
  - `Newtons` and `Degrees` brand the executable sim state at the container
    boundary; `KernelResult` keeps invalid numerical inputs as values.
- `@paideia/ui-sim`
  - `ControlGroup` and `Slider` provide the labelled student-facing controls.
- `@paideia/prediction-gate`
  - `PredictionGate` gates the `component-resolution` observation until the
    package-level prediction is committed.
- `@paideia/content-schema`
  - `TPredictSpec` types the duplicated package predict spec in the executable
    sim package.
- `react`
  - `useMemo` and `useState` drive the local control state for this product
    slice.

## SimulationSpec (frozen)

```yaml
id: component-resolution
title: "Component Resolution Explorer"
interaction_type: diagram-builder
kernel_deps:
  - core/linear-algebra
  - core/prediction-gate
  - core/shared
  - core/ui-sim

predict:
  prompt: |
    A 10 N force acts at 30 degrees above the horizontal. Before revealing the components, which horizontal component is closest?
  commit_format:
    kind: multiple-choice
    options:
      - "5.0 N"
      - "8.7 N"
      - "10.0 N"
      - "11.5 N"
  rationale_required: true

manipulate:
  controls:
    - id: vector-magnitude
      label: "Vector magnitude"
      kind: slider
      kernel_binding: state.magnitudeNewtons
      bounds: { min: 0, max: 20, step: 0.5 }
    - id: angle-above-horizontal
      label: "Angle above horizontal"
      kind: slider
      kernel_binding: state.angleDegrees
      bounds: { min: 0, max: 90, step: 5 }

observe:
  renderers:
    - id: component-resolution
      module: "@paideia/a-level-physics-sims/resolving-vectors"
      symbol: "ResolvingVectorsSim"
      props_binding: "state -> component vector diagram and formula readout"

explain:
  prompt: "After marking the angle reference, which component is adjacent and which is opposite? How do you know?"
  socratic: true
  expected_misconceptions_surfaced:
    - "Sine-cosine swap"
    - "Components as extra forces"
```

## Kernel Boundaries

The sim uses `core/linear-algebra` for finite vector construction and rotation
from the horizontal axis. The container owns the pedagogical framing, labels,
presets, and formula substitution. It does not introduce a local reusable
vector kernel or route the force through `core/mechanics`; resolving a vector
into components is a representation step, not a force-system calculation.

## Accessibility

- Prediction gate uses labelled radio controls and a labelled rationale field.
- Sim controls are labelled range inputs from `@paideia/ui-sim`.
- The SVG diagram has `role="img"` and an accessible label.
- The A-Level shell runs Playwright and axe coverage against the generated
  catalogue route for the first revealed sim state. This container also runs
  through the same shell navigation and prediction-gate contract.

## Tests

- Container validation: `pnpm container:validate`
- Sim harness: `pnpm -F @paideia/a-level-physics-sims test`
- Executable prediction gate regression:
  `a-level/packages/physics-sims/src/resolving-vectors.test.ts`
- Route-level prediction-gate contract:
  `simulation/simulation.test.ts`

## How to run locally

```bash
pnpm container:validate a-level/content/physics/containers/resolving-vectors
pnpm -F @paideia/a-level-physics-sims test
```

## Anieyrudh Filter pass

Date: 2026-05-17
Reviewers: local product-slice audit
Filter version: aniegpt v1.0

### P0 resolved

- Potential P0: component readouts revealed without a committed prediction.
  Resolution: `ResolvingVectorsSim` wraps the full observation surface in
  `PredictionGate`; the jsdom contract asserts the readout is absent until
  prediction commit.
- Potential P0: reusable vector math inlined into the content package.
  Resolution: component calculation now goes through `core/linear-algebra`
  finite vector construction, rotation, matrix-vector multiplication, and
  norm checks. The sim only formats the result and draws the teaching surface.
- Potential P0: empty Filter pass while status is reviewed. Resolution: this
  section records the local critic pass and `container.yaml` points to it.

### P1 issues

- P1: the first resolving-vectors sim was visually and structurally below the
  scalars-and-vectors slice. Resolution: added shared UI controls, presets,
  product readout cards, explicit adjacent/opposite labels, and formula
  substitution.
- P1: metadata still declared `core/numerical-math` and old state names.
  Resolution: `simulation.yaml`, `controls.yaml`, `presets.yaml`,
  `state-labels.yaml`, and `embed/api.ts` now match the branded executable
  state and kernel dependencies.
- P1: route-level axe coverage currently targets the first revealed sim only.
  Resolution: the shell now includes a revealed-state axe test for the
  resolving-vectors route as well as the first scalars-and-vectors route.
- P1: exact prediction answer leaked through the concept card before commit.
  Resolution: canonical examples now use qualitative transfer-safe cases rather
  than the exact `10 N at 30 degrees` prediction calculation.
- P1: misconception names cued the target error before prediction. Resolution:
  the shell no longer renders misconception names in the pre-gate right rail;
  misconception details remain in `container.yaml` and the allowed
  `concept-map/concept-map.yaml` misconception graph. A standalone
  `misconceptions.md` was tested and rejected because the current validator
  disallows extra top-level files.

### High-bandwidth questions surfaced

- Should `core/linear-algebra` grow a named polar-to-Cartesian helper after the
  third vector container, or should this remain composition of existing vector
  primitives?
- Should each container declare its own post-reveal axe contract, or should the
  shell generate one accessibility test per sim from the knowledge graph?

### Accessibility summary

Latest local shell run on 2026-05-17:

- `has no critical accessibility violations on the first shell screen` passed.
- `has no critical accessibility violations after the scalars-and-vectors sim is revealed` passed.
- `has no critical accessibility violations after the resolving-vectors sim is revealed` passed.

## Failure log

| Attempt | Failed where | Symptom | Resolution |
| --- | --- | --- | --- |
| Reuse the draft sim unchanged | Product review | Plain controls and bare tuple math did not match the first product slice quality bar | Upgraded to shared controls, formula-backed readouts, presets, and branded kernel results |
| Keep `core/numerical-math` metadata | Kernel boundary review | Metadata described scalar helpers instead of vector component resolution | Switched declared dependencies to `core/linear-algebra`, `core/shared`, `core/ui-sim`, and `core/prediction-gate` |
| Treat components as a mechanics force calculation | Boundary design | This would imply a force-system sum rather than resolving one vector into an equivalent representation | Kept mechanics out of this slice and used linear-algebra primitives |

## Deferred fixes

- Advisor sign-off remains deferred until a human Physics reviewer checks the
  final copy against the classroom sequence. Future fix location:
  `advisor_signoffs` in `container.yaml`.
- Shell accessibility should eventually run the revealed-state axe contract for
  every generated interactive sim, not just the current first product slice.
