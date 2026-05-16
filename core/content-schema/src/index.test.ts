import { describe, expect, it } from "vitest";
import {
  ConceptMapSpec,
  ConceptPackageSpec,
  CourseMap,
  PredictSpec,
  SimulationSpec,
} from "./index.js";

describe("ContainerSpec compatibility alias", () => {
  const minimal = {
    schema_version: "1.0.0" as const,
    id: "simple-harmonic-motion",
    branch: "a-level" as const,
    subject: "physics",
    level: "H2",
    title: "Simple Harmonic Motion",
    one_line_summary: "Predict-driven exploration of period, amplitude, and energy in SHM.",
    aid_types: ["reasoning-lab" as const],
    predict_at: "none" as const,
    components: {
      concept_card: "concept-card.md",
      concept_map: "concept-map/concept-map.yaml",
      mindmap: "concept-map/mindmap.md",
      mermaid: "concept-map/graph.mmd",
      media: "media",
      embed: "embed",
      problem_solving: "problem-solving",
      sources: "sources.md",
    },
    capabilities: {
      sim_worthy: false,
      interactive_simulation: false,
    },
    problem_solving: {
      algorithm: "problem-solving/algorithm.md",
      steps: "problem-solving/steps.yaml",
    },
    embed_api: {
      entry: "embed/index.ts",
      api: "embed/api.ts",
      methods: ["load", "saveState", "score", "resume", "syncTheme", "destroy"] as const,
    },
    concept_map: {
      spec: "concept-map/concept-map.yaml",
      mindmap: "concept-map/mindmap.md",
      mermaid: "concept-map/graph.mmd",
    },
    transfer_problems: [],
    assessments: [],
    status: "skeleton" as const,
    authoring: {
      owner: "Anieyrudh R",
      reviewers: [],
      qa_status: "not-started" as const,
      dependency_graph: "concept-map/concept-map.yaml",
      changelog: [],
    },
    authors: ["Anieyrudh R"],
    advisor_signoffs: [],
    misconceptions: [],
    sources: [],
  };

  it("accepts a minimal valid container", () => {
    const r = ConceptPackageSpec.safeParse(minimal);
    expect(r.success).toBe(true);
  });

  it("rejects an invalid id (non-kebab)", () => {
    const r = ConceptPackageSpec.safeParse({ ...minimal, id: "Simple_Harmonic" });
    expect(r.success).toBe(false);
  });

  it("rejects unknown aid_types", () => {
    const r = ConceptPackageSpec.safeParse({
      ...minimal,
      aid_types: ["mind-control"],
    });
    expect(r.success).toBe(false);
  });

  it("requires at least one aid_type", () => {
    const r = ConceptPackageSpec.safeParse({ ...minimal, aid_types: [] });
    expect(r.success).toBe(false);
  });

  it("requires at least one author", () => {
    const r = ConceptPackageSpec.safeParse({ ...minimal, authors: [] });
    expect(r.success).toBe(false);
  });

  it("rejects unknown schema_version", () => {
    const r = ConceptPackageSpec.safeParse({ ...minimal, schema_version: "2.0.0" });
    expect(r.success).toBe(false);
  });

  it("requires simulation aid_type when simulation is declared", () => {
    const r = ConceptPackageSpec.safeParse({
      ...minimal,
      components: {
        ...minimal.components,
        simulation: "simulation",
      },
      simulation: {
        spec: "simulation/simulation.yaml",
        controls: "simulation/controls.yaml",
        presets: "simulation/presets.yaml",
        state_labels: "simulation/state-labels.yaml",
        runtime: "simulation/runtime.yaml",
      },
    });
    expect(r.success).toBe(false);
  });

  it("requires coherent transfer metadata when transfer aid_type is declared", () => {
    const r = ConceptPackageSpec.safeParse({
      ...minimal,
      aid_types: ["transfer-problem"],
    });
    expect(r.success).toBe(false);
  });

  it("requires package_predict only when package-level prediction is declared", () => {
    const r = ConceptPackageSpec.safeParse({
      ...minimal,
      predict_at: "package-level",
    });
    expect(r.success).toBe(false);
  });

  it("requires Filter metadata only at its configured lifecycle threshold", () => {
    const draft = ConceptPackageSpec.safeParse({
      ...minimal,
      status: "draft",
      review: {
        anieyrudh_filter: {
          required_for_status: "published",
        },
      },
    });
    expect(draft.success).toBe(true);

    const published = ConceptPackageSpec.safeParse({
      ...minimal,
      status: "published",
      review: {
        anieyrudh_filter: {
          required_for_status: "published",
        },
      },
    });
    expect(published.success).toBe(false);
  });

  it("requires all mandatory embed API methods", () => {
    const r = ConceptPackageSpec.safeParse({
      ...minimal,
      embed_api: {
        ...minimal.embed_api,
        methods: ["load", "saveState", "score", "resume", "destroy"],
      },
    });
    expect(r.success).toBe(false);
  });
});

describe("ConceptMapSpec", () => {
  it("accepts an empty but explicit graph for a standalone concept", () => {
    const r = ConceptMapSpec.safeParse({
      schema_version: "1.0.0",
      concept_id: "simple-harmonic-motion",
      prerequisites: [],
      downstream: [],
      siblings: [],
      misconception_graph: { nodes: [], edges: [] },
      mermaid_source: "graph.mmd",
    });
    expect(r.success).toBe(true);
  });
});

describe("PredictSpec discriminated union", () => {
  it("accepts a ranking predict with options", () => {
    const r = PredictSpec.safeParse({
      prompt: "What happens to the period when you double the mass?",
      commit_format: {
        kind: "ranking",
        options: ["doubles", "stays the same", "halves", "decreases by √2"],
      },
    });
    expect(r.success).toBe(true);
  });

  it("rejects a ranking predict with no options", () => {
    const r = PredictSpec.safeParse({
      prompt: "What happens?",
      commit_format: { kind: "ranking", options: [] },
    });
    expect(r.success).toBe(false);
  });

  it("accepts a value predict with a unit", () => {
    const r = PredictSpec.safeParse({
      prompt: "Estimate the period in seconds.",
      commit_format: { kind: "value", unit: "seconds" },
    });
    expect(r.success).toBe(true);
  });
});

describe("SimulationSpec", () => {
  it("requires at least one manipulate control", () => {
    const r = SimulationSpec.safeParse({
      id: "shm-mass-spring",
      title: "Mass on a spring",
      interaction_type: "function-plot-with-draggable",
      manipulate: { controls: [] },
      observe: {
        renderers: [
          {
            id: "spring-mass",
            module: "core/plotting",
            symbol: "FunctionPlot",
            props_binding: "state.position",
          },
        ],
      },
      explain: { prompt: "Why did the period stay the same?" },
    });
    expect(r.success).toBe(false);
  });
});

describe("CourseMap", () => {
  it("requires at least one concept", () => {
    const r = CourseMap.safeParse({
      schema_version: "1.0.0",
      branch: "a-level",
      subject: "physics",
      concepts: [],
    });
    expect(r.success).toBe(false);
  });
});
