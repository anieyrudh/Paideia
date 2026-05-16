import { describe, expect, it } from "vitest";
import {
  ConceptPackageSpec,
  CourseMap,
  PredictSpec,
  SimulationSpec,
} from "./index.js";

describe("ConceptPackageSpec", () => {
  const minimal = {
    schema_version: "1.0.0" as const,
    id: "simple-harmonic-motion",
    branch: "a-level" as const,
    subject: "physics",
    title: "Simple Harmonic Motion",
    one_line_summary: "Predict-driven exploration of period, amplitude, and energy in SHM.",
    aid_types: ["reasoning-lab" as const],
    predict_at: "none" as const,
    items: {
      concept_card: "concept-card.md",
      sources: "sources.md",
      sims: [],
      transfer_problems: [],
      assessments: [],
    },
    status: "skeleton" as const,
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

  it("requires simulation aid_type when sims are declared", () => {
    const r = ConceptPackageSpec.safeParse({
      ...minimal,
      items: {
        ...minimal.items,
        sims: [
          {
            id: "shm-mass-spring",
            title: "Mass on a spring",
            interaction_type: "function-plot-with-draggable",
            manipulate: {
              controls: [
                {
                  id: "mass",
                  label: "Mass",
                  kind: "slider",
                  kernel_binding: "state.mass",
                },
              ],
            },
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
          },
        ],
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
