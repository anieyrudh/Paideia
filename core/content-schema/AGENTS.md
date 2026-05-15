# core/content-schema · agent contract

## What this module is
The single source of truth for the shape of every learner-facing artefact in the monorepo: concept packages, simulation specs, the four PMOE-T stages (Predict, Manipulate, Observe, Explain), transfer problems, assessments, rubrics, concept-card frontmatter, course maps, and provenance records. Schemas are defined with Zod and re-exported as TypeScript types. Validators (CI and runtime) consume these; sim authors and the Filter both target them.

## Public interface
All exports are `z.ZodSchema` paired with `z.infer` types under `@paideia/content-schema`:

- `ConceptPackageSpec` / `ConceptPackageSpecT`
- `SimulationSpec` / `SimulationSpecT`
- `PredictSpec`, `ManipulateSpec`, `ObserveSpec`, `ExplainSpec` (the four PMOE-T stage specs)
- `TransferProblem` / `TransferProblemT`
- `AssessmentVariant` / `AssessmentVariantT`
- `RubricTrace` / `RubricTraceT`
- `ConceptCardFrontmatter` / `ConceptCardFrontmatterT`
- `CourseMap` / `CourseMapT`
- `Provenance`, `Source`, `MisconceptionEntry`
- `SCHEMA_VERSION: "1.0.0"` (string literal)

Anything not listed — internal helpers, regex constants, narrowing utilities — is not part of the public contract.

## Invariants the caller must preserve
- Every artefact MUST validate with `<Schema>.parse(obj)` before it is persisted, rendered, or sent to a model. `safeParse` is acceptable when the caller handles the error path explicitly.
- `schema_version` MUST equal `SCHEMA_VERSION` on every persisted artefact.
- `Provenance.prompt_version` and `Provenance.prompt_sha256` MUST be filled from `core/aniegpt` — never hand-typed.
- Refinements (e.g. PMOE-T stages must appear in order Predict → Manipulate → Observe → Explain) are enforced inside the schema; do not duplicate them in callers.

## What this module does NOT do
- Does **not** render, evaluate, or simulate anything. Schemas are inert.
- Does **not** ship migrations between schema versions; a major bump is a new contract and consumers re-author.
- Does **not** encode pedagogical defaults (e.g. "rationale_required defaults to true") that belong in `core/prediction-gate`; defaults that affect runtime live with the runtime.
- Does **not** know about UI — no JSX, no React imports, no DOM types.
- Does **not** validate cross-package references (e.g. "concept_id X exists in course-map Y") — that is the validator/CI job, not the schema.

## When to consider this module
Use `core/content-schema` any time you author, validate, persist, or load a concept package, simulation, assessment, rubric, or course map. If you find yourself defining the same field shape inline anywhere else, you should import from here instead.

## Extension protocol
1. Open a `core-change-proposal` issue naming every current consumer (sim-runtime, validator CI, authoring tools, both branch catalogues).
2. Wait for both branches' CI green (`core-changed.yml`).
3. Use `core!:` commit prefix for any change that would fail to parse an existing valid artefact; bump `SCHEMA_VERSION` to the next semver-major.

## Anti-patterns (will be rejected in PR review)
- Branch-specific fields (`sutdOnly`, `aLevelMarks`) — generalise (e.g. `branch_tags: string[]`) or keep the field out.
- `z.any()`, `z.unknown()`, `z.record(z.any())` in artefact schemas — name the shape.
- Schemas defined in a consumer module and "promoted" later — define here from day one.
- Loose `string` where a brand from `@paideia/shared` exists (`ConceptId`, `PackageId`, `SimId`).

## How the Anieyrudh Filter reads this module
The Filter probes that every artefact it reviews **validates against the schema named in its `schema_version`** and that `Provenance` is fully populated. An artefact whose claimed shape diverges from its actual shape is treated as unsigned and rejected — schema fidelity is the floor below which no pedagogical review happens.
