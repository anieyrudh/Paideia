/**
 * @paideia/content-schema — The single source of truth for all curriculum
 * structure across Paideia.
 *
 * Top-level type: ConceptPackageSpec (a container).
 * A container holds one or more sims plus its card, sources, transfer problems,
 * misconceptions, and assessments. The catalogue lists containers. The student
 * launches a container. The Anieyrudh Filter and the container-auditor read
 * containers.
 *
 * Stability discipline:
 * - This schema freezes at week 12 of Phase B. Post-freeze changes need
 *   numbered migrations (see scripts/migrate-schema.mjs).
 * - Any field marked `// LOCKED` cannot change without an ADR.
 * - Optional fields exist so the schema accepts partial-build containers
 *   from B5 (content-only) before B4 fills in sims.
 */

import { z } from "zod";

// ──────────────────────────────────────────────────────────────────────────
// Branding helpers (mirror @paideia/shared without runtime import)
// ──────────────────────────────────────────────────────────────────────────

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const slug = z
  .string()
  .min(2)
  .max(80)
  .regex(slugRegex, "must be kebab-case lowercase");

// ──────────────────────────────────────────────────────────────────────────
// Provenance — used by both remixes and clean-room rebuilds
// ──────────────────────────────────────────────────────────────────────────

export const Provenance = z.object({
  remixed_from: z
    .object({
      package_id: slug,
      commit: z.string().regex(/^[a-f0-9]{7,40}$/),
      changes_summary: z.string().min(10).max(500),
    })
    .optional(),
  cleanroom_inspiration: z
    .object({
      original: z.string().min(2).max(120), // "Voyant Tools", "Argdown"
      algorithm_reference: z.string().min(2).max(300), // paper or textbook
      reviewer: z.string().min(2).max(80),
      attestation: z.literal("no-source-viewed"),
    })
    .optional(),
  reuse_of_phet: z
    .object({
      sim_id: slug, // "calculus-grapher"
      phet_license: z.enum(["MIT", "GPL"]), // GPL blocks reuse
      retrofit_summary: z.string().min(10).max(500),
    })
    .optional(),
});

// ──────────────────────────────────────────────────────────────────────────
// Sources & citations
// ──────────────────────────────────────────────────────────────────────────

export const Source = z.object({
  citation: z.string().min(5).max(500),
  url: z.string().url().optional(),
  publication_year: z.number().int().min(1500).max(2100).optional(),
  license: z.string().min(2).max(80).optional(), // e.g., "CC-BY-4.0", "MIT"
  seab_alignment: z.enum(["matches", "diverges", "n/a"]).optional(),
  needs_verification: z.boolean().default(false),
});

// ──────────────────────────────────────────────────────────────────────────
// Misconceptions
// ──────────────────────────────────────────────────────────────────────────

export const MisconceptionEntry = z.object({
  name: z.string().min(5).max(200),
  description: z.string().min(20).max(1000),
  evidence_source: z.string().min(5).max(500), // PER paper, textbook ch.
  surface_in_predict: z.boolean().default(false), // does the predict prompt elicit this?
});

// ──────────────────────────────────────────────────────────────────────────
// PMOE-T stage shapes
// ──────────────────────────────────────────────────────────────────────────

/** Predict stage — the gate. Committed prediction unlocks the rest. */
export const PredictSpec = z.object({
  prompt: z.string().min(10).max(2000),
  commit_format: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("value"), unit: z.string().optional() }),
    z.object({
      kind: z.literal("ranking"),
      options: z.array(z.string().min(2).max(200)).min(2).max(8),
    }),
    z.object({
      kind: z.literal("sketch"),
      canvas_hint: z.string().max(500).optional(),
    }),
    z.object({
      kind: z.literal("freetext"),
      max_length: z.number().int().positive().default(500),
    }),
    z.object({
      kind: z.literal("multiple-choice"),
      options: z.array(z.string().min(2).max(500)).min(2).max(8),
      correct_index: z.number().int().nonnegative().optional(), // optional: not all predicts have one right answer
    }),
  ]),
  rationale_required: z.boolean().default(true),
});

export const ManipulateSpec = z.object({
  controls: z
    .array(
      z.object({
        id: slug,
        label: z.string().min(2).max(120),
        kind: z.enum([
          "slider",
          "stepper",
          "toggle",
          "selector",
          "drag-point",
          "drag-vector",
          "text-input",
          "code-editor",
        ]),
        kernel_binding: z.string().min(2).max(200), // e.g., "core/physics.oscillator.mass"
        bounds: z
          .object({
            min: z.number(),
            max: z.number(),
            step: z.number().positive().optional(),
          })
          .optional(),
      }),
    )
    .min(1),
});

export const ObserveSpec = z.object({
  renderers: z
    .array(
      z.object({
        id: slug,
        module: z.string().min(2).max(200), // e.g., "core/plotting"
        symbol: z.string().min(2).max(200), // e.g., "FunctionPlot"
        props_binding: z.string().min(2).max(500), // how kernel output maps to props
      }),
    )
    .min(1),
});

export const ExplainSpec = z.object({
  prompt: z.string().min(10).max(2000),
  socratic: z.boolean().default(true),
  expected_misconceptions_surfaced: z.array(z.string()).default([]),
});

export const TransferProblem = z.object({
  id: slug,
  prompt: z.string().min(20).max(3000),
  surface_form: z.string().min(5).max(200), // "tuning fork", "circuit analogy"
  same_concept_check: z.string().min(10).max(500), // why this is genuine transfer
  rubric_path: z.string().optional(), // path to a rubric .md
});

// ──────────────────────────────────────────────────────────────────────────
// SimulationSpec (sub-unit of a container)
// ──────────────────────────────────────────────────────────────────────────

export const SimulationSpec = z.object({
  id: slug,
  title: z.string().min(3).max(200),
  interaction_type: z.enum([
    "function-plot-with-draggable",
    "3D-spatial-manipulation",
    "particle-simulation",
    "force-directed-graph",
    "argument-tree",
    "text-corpus-analysis",
    "mind-map-editor",
    "code-execution-notebook",
    "diagram-builder",
    "animation-playback",
    "decision-matrix",
    "source-annotation",
    "timeline-builder",
    "map-with-data-layers",
    "algorithm-state-visualisation",
    "comparative-matrix",
    "systems-flow-diagram",
    "sketch-input",
    "other",
  ]),
  kernel_deps: z.array(z.string().min(2).max(200)).default([]), // e.g., ["core/numerical-math", "core/plotting"]
  predict: PredictSpec.optional(), // optional if predict_at === "package-level"
  manipulate: ManipulateSpec,
  observe: ObserveSpec,
  explain: ExplainSpec,
});

// ──────────────────────────────────────────────────────────────────────────
// Assessment & spaced repetition
// ──────────────────────────────────────────────────────────────────────────

export const AssessmentVariant = z.object({
  id: slug,
  prompt: z.string().min(10).max(3000),
  variant_kind: z.enum([
    "recall",
    "application",
    "transfer",
    "explanation",
    "prediction-redo",
  ]),
  expected_answer: z.string().optional(), // only if checkable
  rubric_anchor: z.string().optional(), // for rubric-graded items
});

export const RubricTrace = z.object({
  criterion: z.string().min(5).max(200),
  weight: z.number().min(0).max(1),
  performance_descriptors: z.array(z.string().min(10).max(500)).min(2).max(8),
});

// ──────────────────────────────────────────────────────────────────────────
// ConceptCard frontmatter — the .md card body lives separately
// ──────────────────────────────────────────────────────────────────────────

export const ConceptCardFrontmatter = z.object({
  subject: z.string().min(2).max(80), // "physics", "general-paper", "calculus"
  concept: slug,
  branch: z.enum(["a-level", "sutd"]),
  level: z.string().min(1).max(40).optional(), // "H2", "H1", "Freshmore"
  syllabus_ref: z.string().min(2).max(120).optional(), // "9749 / 17"
  prerequisites: z.array(slug).default([]),
  aid_types: z
    .array(
      z.enum([
        "simulation",
        "reasoning-lab",
        "notebook",
        "misconception-audit",
        "transfer-problem",
        "annotated-source",
        "concept-card",
        "decision-matrix",
        "fsrs",
      ]),
    )
    .default(["concept-card"]),
  status: z.enum(["skeleton", "draft", "reviewed", "ready-for-build", "published"])
    .default("skeleton"),
});

// ──────────────────────────────────────────────────────────────────────────
// ConceptPackageSpec — the container manifest (TOP-LEVEL TYPE)
// ──────────────────────────────────────────────────────────────────────────

export const ConceptPackageSpec = z.object({
  // LOCKED — never change without ADR + migration.
  schema_version: z.literal("1.0.0"),

  // Identity
  id: slug, // "simple-harmonic-motion"
  branch: z.enum(["a-level", "sutd"]), // LOCKED
  subject: z.string().min(2).max(80), // "physics"
  title: z.string().min(3).max(200),
  one_line_summary: z.string().min(10).max(300),

  // Curriculum alignment
  syllabus_ref: z.string().min(2).max(120).optional(), // SEAB code or SUTD course code
  level: z.string().min(1).max(40).optional(),
  prerequisites: z.array(slug).default([]),

  // Pedagogy
  aid_types: z
    .array(
      z.enum([
        "simulation",
        "reasoning-lab",
        "notebook",
        "misconception-audit",
        "transfer-problem",
        "annotated-source",
      ]),
    )
    .min(1),
  predict_at: z.enum(["package-level", "per-sim", "both"]).default("package-level"),

  // Package-level predict (used when predict_at !== "per-sim")
  package_predict: PredictSpec.optional(),

  // Container items — these mirror the on-disk folder layout
  items: z.object({
    concept_card: z.string().min(3).max(200).default("concept-card.md"), // path
    decision_matrix: z.string().optional(),
    misconceptions: z.string().optional(),
    sources: z.string().min(3).max(200).default("sources.md"),
    sims: z.array(SimulationSpec).default([]),
    transfer_problems: z.array(TransferProblem).default([]),
    assessments: z.array(AssessmentVariant).default([]),
    rubric: z.array(RubricTrace).optional(),
  }),

  // Lifecycle & provenance
  status: z
    .enum(["skeleton", "content-only", "draft", "reviewed", "ready-for-build", "published"])
    .default("skeleton"),
  provenance: Provenance.optional(),
  authors: z.array(z.string().min(2).max(120)).min(1),
  advisor_signoffs: z
    .array(
      z.object({
        name: z.string().min(2).max(120),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        incorporated_change: z.string().min(10).max(1000),
      }),
    )
    .default([]),

  // Quality gates
  filter_pass: z
    .object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      p0_issues_resolved: z.boolean(),
      p1_issues_addressed_or_deferred: z.boolean(),
      output_in_technical_md: z.boolean(),
    })
    .optional(),

  // Misconceptions surfaced by this container (cross-ref to misconceptions.md)
  misconceptions: z.array(MisconceptionEntry).default([]),

  // Sources cited in this container (cross-ref to sources.md)
  sources: z.array(Source).default([]),

  // Localisation
  language: z.string().regex(/^[a-z]{2}(-[A-Z]{2})?$/).default("en"),
});

// ──────────────────────────────────────────────────────────────────────────
// CourseMap — subject-level concept ordering and prerequisite graph
// ──────────────────────────────────────────────────────────────────────────

export const CourseMap = z.object({
  schema_version: z.literal("1.0.0"),
  branch: z.enum(["a-level", "sutd"]),
  subject: z.string().min(2).max(80),
  syllabus_ref: z.string().optional(),
  concepts: z
    .array(
      z.object({
        id: slug,
        title: z.string().min(3).max(200),
        prerequisites: z.array(slug).default([]),
        package_id: slug, // points to a ConceptPackage
        status: z.enum(["planned", "skeleton", "in-build", "shipped", "deferred"]),
      }),
    )
    .min(1),
});

// ──────────────────────────────────────────────────────────────────────────
// Exported types (inferred from schemas)
// ──────────────────────────────────────────────────────────────────────────

export type TProvenance = z.infer<typeof Provenance>;
export type TSource = z.infer<typeof Source>;
export type TMisconceptionEntry = z.infer<typeof MisconceptionEntry>;
export type TPredictSpec = z.infer<typeof PredictSpec>;
export type TManipulateSpec = z.infer<typeof ManipulateSpec>;
export type TObserveSpec = z.infer<typeof ObserveSpec>;
export type TExplainSpec = z.infer<typeof ExplainSpec>;
export type TTransferProblem = z.infer<typeof TransferProblem>;
export type TSimulationSpec = z.infer<typeof SimulationSpec>;
export type TAssessmentVariant = z.infer<typeof AssessmentVariant>;
export type TRubricTrace = z.infer<typeof RubricTrace>;
export type TConceptCardFrontmatter = z.infer<typeof ConceptCardFrontmatter>;
export type TConceptPackageSpec = z.infer<typeof ConceptPackageSpec>;
export type TCourseMap = z.infer<typeof CourseMap>;
