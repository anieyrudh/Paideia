# Container Specification

**Status:** Phase B · v2 container architecture. Schema-breaking changes require
an ADR and a migration.

A **container** is a self-contained concept product. The curriculum shell owns
search, subject/module navigation, learner profile, mastery map, and
cross-container recommendations. Each container owns its own explanation,
concept graph, simulation, media, embed contract, and problem-solving logic.

The UI/UX is deliberately flexible. Predict -> Manipulate -> Observe -> Explain
-> Transfer is a useful learning pattern, not a required visible layout.

## 1. Canonical Layout

```text
<branch>/content/<subject>/containers/<concept-id>/
├── container.yaml              REQUIRED · validates against ContainerSpec
├── concept-card.md             REQUIRED · first-principles explanation
├── concept-map/                REQUIRED
│   ├── concept-map.yaml        REQUIRED · validates against ConceptMapSpec
│   ├── mindmap.md              REQUIRED · human-friendly overview
│   └── graph.mmd               REQUIRED · Mermaid graph source
├── simulation/                 REQUIRED for sim-worthy concepts
│   ├── simulation.yaml         REQUIRED · validates against SimulationSpec
│   ├── index.tsx               REQUIRED
│   ├── controls.yaml           REQUIRED
│   ├── presets.yaml            REQUIRED
│   ├── runtime.yaml            REQUIRED
│   ├── state-labels.yaml       REQUIRED
│   └── simulation.test.ts      REQUIRED · prediction-gate assertion if predict is declared
├── embed/                      REQUIRED
│   ├── api.ts                  REQUIRED · load/saveState/score/resume/syncTheme/destroy
│   ├── index.ts                REQUIRED
│   └── embed.test.ts           REQUIRED · contract marker or executable tests
├── media/                      REQUIRED
│   ├── thumbnail.svg           REQUIRED
│   └── fallback.svg            REQUIRED
├── problem-solving/            REQUIRED
│   ├── algorithm.md            REQUIRED
│   ├── steps.yaml              REQUIRED
│   └── <transfer-id>.md        REQUIRED for each transfer problem
├── sources.md                  OPTIONAL but expected for cited curriculum work
├── README.md                   REQUIRED
└── TECHNICAL.md                REQUIRED
```

`<branch>` is one of the curriculum or shared delivery roots:

- `a-level` for A-Level curriculum wrappers.
- `sutd` for SUTD curriculum wrappers.
- `shared` for reusable cross-curriculum concept products.

Shared-core containers live at:

```text
shared/content/<discipline>/containers/<concept-id>/
```

Use the queue entry's `discipline` as `<discipline>` unless an ADR defines a
more specific shared taxonomy. Curriculum containers may wrap, recommend, or
link to shared-core containers, but they must not relocate a `shared.*` queue
item into `a-level/` or `sutd/`.

## 2. Minimum Complete Container

A complete container must include:

- **Concept identity:** stable `id`, aliases, subject, level/module, syllabus references.
- **First-principles explanation:** `concept-card.md` with definitions, why the concept matters, canonical examples, and common misconceptions.
- **Concept map:** prerequisites, downstream links, sibling concepts, misconception graph, and Mermaid source.
- **Interactive simulation:** mandatory when `capabilities.sim_worthy` or `capabilities.interactive_simulation` is true.
- **Problem-solving algorithm:** stepwise solver, strategy tree, proof outline, or decision procedure.
- **Embed API:** `load`, `saveState`, `score`, `resume`, `syncTheme`, and `destroy`.
- **Authoring metadata:** owner, reviewers, QA status, dependency graph, and changelog.
- **Media:** thumbnail plus fallback static visual.

Optional but high-value surfaces:

- `notebook-lab/` for computational or data-driven topics.
- `visual-derivation/` for interactive derivations in maths and physics.

## 3. `container.yaml`

`container.yaml` is the source of truth. It validates against
`ContainerSpec` in `core/content-schema`.

It records:

- concept identity and aliases
- curriculum mapping
- declared aid types and capabilities
- component paths
- simulation, embed, concept-map, and problem-solving contracts
- transfer problems, assessments, sources, and misconceptions
- authoring metadata and review gates

The validator rejects dangling declarations. If a container declares a
simulation, transfer problem, misconception audit, or prediction path, the
corresponding files and tests must exist.

## 4. Generated Graph Data

Curriculum shells must not hand-code container relationships. The generated
knowledge graph index is built from:

```text
container.yaml + concept-map/concept-map.yaml + simulation/simulation.yaml
```

Run:

```bash
pnpm graph:generate
```

For A-Level this emits:

```text
a-level/apps/shell/src/generated/knowledge-graph.tsx
```

Future curriculum shells get their own generated output from the same script.

## 5. Generated Container Docs

Container `README.md` and `TECHNICAL.md` are generated from the canonical
container sources:

```text
container.yaml + concept-card.md + simulation/simulation.yaml + concept-map/ + problem-solving/ + sources.md
```

Run:

```bash
pnpm container:docs <container-path>
```

For all containers:

```bash
pnpm container:docs
```

To check whether generated docs are current without writing files:

```bash
pnpm container:docs --check
```

`TECHNICAL.md` preserves the human review sections that should not be
clobbered by regeneration, including the Anieyrudh Filter pass and iteration
or failure logs.

## 6. Validation

Run:

```bash
pnpm container:validate
```

The validator enforces:

1. The v2 directory layout.
2. `container.yaml` parses against `ContainerSpec`.
3. `concept-map/concept-map.yaml` parses against `ConceptMapSpec`.
4. `simulation/simulation.yaml` parses against `SimulationSpec` when simulation is declared.
5. All embed API methods are present.
6. `simulation/simulation.test.ts` contains `prediction-gate` when prediction is declared.
7. Transfer problem markdown exists for each declared transfer problem.
8. Filter output is required only once the container reaches its configured review lifecycle threshold.
9. Kernel dependencies resolve to existing `core/<module>/` directories.

Failures block merge.

## 7. Lifecycle

`status` values:

1. `skeleton` — scaffolded, not useful yet.
2. `content-only` — explanation and concept map exist; sim may still be absent.
3. `draft` — declared pieces are implemented enough for product iteration.
4. `reviewed` — reviewer pass green; CI green.
5. `ready-for-build` — final integration check passed.
6. `published` — advisor sign-off recorded; Filter P0 count is zero.

## 8. Reference

- Schema: [`core/content-schema/src/index.ts`](../core/content-schema/src/index.ts)
- Templates: [`core/docs-templates/`](../core/docs-templates/)
- Validator: [`scripts/validate-containers.mjs`](../scripts/validate-containers.mjs)
- Container docs generator: [`scripts/generate-container-docs.mjs`](../scripts/generate-container-docs.mjs)
- Generator: [`scripts/generate-knowledge-graph.mjs`](../scripts/generate-knowledge-graph.mjs)
