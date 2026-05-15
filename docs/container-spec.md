# Container Specification (ConceptPackage)

**Status:** Locked at Phase A · day 2 · v1.0.0. Any change requires an ADR and a numbered schema migration.

A **container** (formally: ConceptPackage) is the unit of work, of authoring, and of student-facing delivery. The catalogue lists containers. The student launches a container. An agent scaffolds a container. The Anieyrudh Filter and `container-auditor` subagent read a container.

A container holds **one concept**, exposed through **one or more sims** plus all supporting items — concept card, decision matrix, misconceptions, sources, transfer problems, assessments. The PMOE-T loop runs at the container level.

## 1. Canonical directory layout (REQUIRED EXACTLY)

```
<branch>/content/<subject>/concept-packages/<package-id>/
├── concept-package.yaml         REQUIRED · validates against ConceptPackageSpec
├── concept-card.md              REQUIRED · explanatory body
├── sources.md                   REQUIRED · citations
├── decision-matrix.md           OPTIONAL · 6-panel pedagogy decisions
├── misconceptions.md            OPTIONAL · named misconceptions + evidence
├── sims/                        REQUIRED (may be empty for content-only)
│   └── <sim-id>/
│       ├── SimulationSpec.yaml  REQUIRED if sim/ directory exists
│       ├── index.tsx            REQUIRED if sim/ directory exists
│       └── <sim-id>.test.ts     REQUIRED · MUST contain prediction-gate Playwright
├── transfer/                    OPTIONAL
│   └── <problem-id>.md
├── assessments/                 OPTIONAL
│   └── fsrs-cards.yaml
├── README.md                    REQUIRED · auto-generated descriptive doc
└── TECHNICAL.md                 REQUIRED · auto-generated technical doc + Filter section
```

### 1.1 Path conventions

- `<branch>` — exactly one of `a-level` or `sutd` (future branches added via ADR).
- `<subject>` — kebab-case. Examples: `physics`, `general-paper`, `calculus`, `programming`.
- `<package-id>` — kebab-case. MUST match `concept-package.yaml` `id` field. Examples: `simple-harmonic-motion`, `derivative-microscope`.
- `<sim-id>` — kebab-case. MUST match `SimulationSpec.yaml` `id` field.
- `<problem-id>` — kebab-case. MUST match the `id` in the corresponding `TransferProblem` entry in `concept-package.yaml`.

### 1.2 Files MUST be exactly these names

The validator (`pnpm container:validate`) rejects containers with:
- Extra top-level files outside the canonical list.
- Top-level files named differently (e.g., `readme.md`, `README.MD`, `Concept Card.md`).
- Sim directories without `SimulationSpec.yaml`.
- Sim directories without a `*.test.ts` file matching `<sim-id>.test.ts`.

This rigidity is intentional. **The container shape is the API.** Authors compose their work into the shape; tools (catalogue glob, RAG retrieval, validator, scaffolder) depend on the shape being predictable.

### 1.3 What MAY appear

Per-package extension files (e.g., `historical-context.md`, `lab-procedure.md`) are allowed under a single optional subfolder:

```
<package-id>/
└── extras/
    └── <whatever>.md
```

`extras/` is opaque to the validator. Tooling does not index it. Authors use it for branch-specific or subject-specific supplementary content that doesn't fit the canonical items. Do not over-rely on `extras/`; if content belongs in the standard items, put it there.

## 2. File contents (canonical templates)

Every file follows a canonical template. The scaffolder produces these on `pnpm container:new`. Author edits content, never structure.

### 2.1 `concept-package.yaml`

The container manifest. Validates against `ConceptPackageSpec` in `core/content-schema`. Single source of truth — every other file's metadata defers to this.

See `core/docs-templates/concept-package.template.yaml`.

### 2.2 `concept-card.md`

Frontmatter (validates against `ConceptCardFrontmatter`) + body.

```markdown
---
subject: physics
concept: simple-harmonic-motion
branch: a-level
level: H2
syllabus_ref: "9749 / 17"
prerequisites: [calculus-derivatives, vectors]
aid_types: [concept-card, simulation, misconception-audit]
status: draft
---

# Simple Harmonic Motion

## What this teaches

(One paragraph. Plain language. No jargon. A teacher should know within
30 seconds whether to assign this.)

## What the student does

- **Predict:** ...
- **Manipulate:** ...
- **Observe:** ...
- **Explain:** ...
- **Transfer:** ...

## Pedagogical choices and why

- Why this predict format?
- Why this transfer problem?
- What misconceptions does this surface?

## Notes for the teacher

(Anything that doesn't fit on the student-facing surface.)
```

### 2.3 `sources.md`

```markdown
# Sources

## Primary references

- (full citation with URL, year, license, SEAB-alignment annotation)

## SEAB / syllabus anchors

- (exact section reference + quotation if material)

## Misconception evidence

- (PER paper or textbook chapter naming the misconception)

## Reuse and attribution

- (Note any reused PhET sims, CC-licensed materials, etc.)
```

### 2.4 `decision-matrix.md` (optional but recommended)

6-panel pedagogy decision record (per A-Level Product Details §7). Used at Phase 1 of branch work; persists as the rationale record for the container.

```markdown
# Decision Matrix · <Concept>

## 1. Concept boundary
What's in this container? What's deliberately out?

## 2. Predict format
Why ranking / value / sketch / freetext?

## 3. Manipulate variables
Which kernel knobs are exposed? Which are intentionally hidden?

## 4. Observe rendering
Why this renderer? What does the student see first?

## 5. Explain prompt
Socratic question + expected misconceptions to surface.

## 6. Transfer surface
Why is the transfer problem genuinely different from the manipulate stage?
```

### 2.5 `misconceptions.md`

```markdown
# Misconceptions

## <Misconception name>
**Evidence**: (PER paper or textbook citation)
**Surface in predict?** yes/no
**Description**: ...

(Repeat per misconception. At least 2 expected.)
```

### 2.6 `sims/<sim-id>/SimulationSpec.yaml`

Validates against `SimulationSpec`. See `core/docs-templates/simulation-spec.template.yaml`.

### 2.7 `sims/<sim-id>/index.tsx`

The React entry point. Imports the prediction gate, the PMOE-T runtime, the kernel(s), the renderer(s). Hot-reloadable.

See `core/docs-templates/sim-index.template.tsx`.

### 2.8 `sims/<sim-id>/<sim-id>.test.ts`

Playwright test. MUST include at least one test asserting the prediction gate blocks reveal until commit. CI fails the build if this assertion is absent.

See `core/docs-templates/sim-test.template.ts`.

### 2.9 `transfer/<problem-id>.md`

Markdown body of the transfer problem. Each problem must correspond to a `TransferProblem` entry in `concept-package.yaml`.

### 2.10 `assessments/fsrs-cards.yaml`

Optional. List of `AssessmentVariant` entries. Consumed by `core/fsrs`.

### 2.11 `README.md` (auto-generated, do not edit by hand)

The descriptive doc — for teachers, students, advisors. Generated by `/new-container` and updated by `/review-container`. See `core/docs-templates/README.template.md`.

Required sections:
- What this teaches
- What the student does (PMOE-T)
- Pedagogical choices and why
- Citations and provenance
- Author + date + advisor sign-offs

### 2.12 `TECHNICAL.md` (auto-generated, do not edit by hand)

The technical doc — for maintainers and future agents. Generated by `/new-container`, updated by `/review-container`, and (mandatorily) by the agent on every change.

Required sections:
- Imports (`core/` modules consumed with specific exported symbols)
- SimulationSpec (frozen, full validated YAML)
- Kernel extensions (core-change-proposal issue links)
- Accessibility (axe report summary)
- Tests (file paths)
- How to run locally
- **Anieyrudh Filter pass** (P0/P1 items + resolution) — **MUST be non-empty before merge**
- Iteration log (what the agent did, what was rejected)

The `daily-compliance-audit.yml` scheduled workflow scans every container's `TECHNICAL.md` and creates Issues for any with an empty Filter section.

## 3. Validation

Validator: `scripts/validate-containers.mjs` (added in Phase A · CI workflow). Runs on every PR via `boundary-check.yml` and once per container on every push.

The validator enforces:
1. Directory tree matches §1.
2. `concept-package.yaml` parses against `ConceptPackageSpec`.
3. Each `sims/<sim-id>/SimulationSpec.yaml` parses against `SimulationSpec`.
4. Each sim has a `*.test.ts` containing the literal token `prediction-gate` somewhere in the file (lint-level proxy for the real Playwright assertion).
5. `concept-card.md` frontmatter parses against `ConceptCardFrontmatter`.
6. `TECHNICAL.md` has a non-empty section under `## Anieyrudh Filter pass`.
7. Every kernel listed in `kernel_deps` resolves to an existing `core/<module>/` directory.
8. No file in the container imports from another branch (`a-level/` cannot import `sutd/` and vice versa). This is enforced by `boundary-check.yml` via dependency-cruiser.

Failures BLOCK MERGE. There is no opt-out.

## 4. Scaffolding

```bash
pnpm container:new
# Prompts:
#   Branch (a-level / sutd):
#   Subject (physics / general-paper / ...):
#   Package id (kebab-case, e.g., simple-harmonic-motion):
#   Title:
#   Primary interaction type (function-plot-with-draggable / 3D-spatial-manipulation / ...):
# Produces the full §1 directory tree, populated with §2 templates.
```

Or use the Claude skill `/new-container` for an agent-driven flow.

## 5. Lifecycle

A container moves through these states (the `status` field in `concept-package.yaml`):

1. `skeleton` — scaffolded, no real content yet.
2. `content-only` — concept card + sources + misconceptions filled by B5 (Codex content pack). Sims still stubbed.
3. `draft` — sims implemented; Anieyrudh Filter pass run; ready for review.
4. `reviewed` — fresh-session reviewer pass green; CI green.
5. `ready-for-build` — final integration check passed; ready for advisor sign-off.
6. `published` — advisor sign-off recorded; live on production catalogue.

The `daily-coverage-report.yml` workflow aggregates these states into `docs/_meta/coverage.md`.

## 6. Remixing

To remix an existing container:

```bash
pnpm container:remix <source-package-id> <new-package-id>
```

This:
1. Copies the source container to a new directory.
2. Populates `concept-package.yaml`'s `provenance.remixed_from` with the source id and current commit SHA.
3. Resets `status` to `draft`.
4. Resets `advisor_signoffs` to `[]`.
5. Preserves `authors` from source, prepends the remixer.

Attribution to the original author is auto-injected into `README.md` by the validator on every build.

## 7. Cross-references between files

| File | Source-of-truth field | Cross-referenced from |
|---|---|---|
| `concept-package.yaml`: `id` | Authority | Directory name; SimulationSpecs' `package_id`; CourseMap |
| `concept-package.yaml`: `items.sims[].id` | Authority | Sim directory name |
| `concept-package.yaml`: `items.transfer_problems[].id` | Authority | Transfer file name |
| `concept-card.md` frontmatter `concept` | Equals `concept-package.yaml.id` | Validator rejects mismatch |
| `concept-card.md` frontmatter `branch`, `subject` | Equals top-level fields in `concept-package.yaml` | Validator rejects mismatch |

The validator hard-fails any divergence. Single source of truth for every fact: `concept-package.yaml`.

## 8. Why this rigidity

Three things become free when the container shape is locked:

- **Catalogue glob discovery** — `import.meta.glob('**/concept-package.yaml')` produces the catalogue with zero registry maintenance.
- **AI tutor RAG scope** — the tutor retrieves over a single container's files when answering a student question. Predictable shape means predictable retrieval.
- **Agent reasoning** — every coding agent reads `concept-package.yaml` first, then knows where to find everything else without searching.

The cost is small: authors learn one shape. The benefit compounds for every subsequent sim, every contributor, every tool.

## 9. Open conventions

- **Image assets** for sims live in `sims/<sim-id>/assets/`. The validator does not check inside `assets/`.
- **Localisation** (multi-language content) is deferred to v1.1. v0 ships English; the `language` field in `ConceptPackageSpec` defaults to `en`. Future: sibling files like `concept-card.zh.md`.
- **Telemetry hooks** are wired in `core/sim-runtime`; sims do not emit telemetry directly. Container authors never write telemetry code.

## 10. Reference

- Schema: [`core/content-schema/src/index.ts`](../core/content-schema/src/index.ts)
- Templates: [`core/docs-templates/`](../core/docs-templates/)
- Validator: [`scripts/validate-containers.mjs`](../scripts/validate-containers.mjs)
- Scaffolder: [`core/scaffolder/`](../core/scaffolder/) and skill `/new-container`
- ADRs that affect this spec: [`docs/adr/`](./adr/)
