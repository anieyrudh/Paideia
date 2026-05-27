import { describe, expect, it } from "vitest";

import {
  filterContainers,
  masteryStatus,
  masterySummary,
  nextReadyContainers,
  normalizeSearchQuery,
  searchResultSummary,
  type MasteryRecord,
  type SearchableContainer,
} from "./logic.js";

const containers: readonly SearchableContainer[] = [
  {
    id: "physics/scalars",
    title: "Scalars and Vectors",
    subject: "Physics",
    level: "A-Level",
    module: "Measurement",
    summary: "Resolve direction and magnitude.",
    keywords: ["vector", "résultant"],
  },
  {
    id: "physics/forces",
    title: "Forces and Equilibrium",
    subject: "Physics",
    level: "A-Level",
    module: "Mechanics",
    summary: "Balance forces in two dimensions.",
    keywords: ["free body"],
  },
  {
    id: "math/hypothesis",
    title: "Hypothesis Testing",
    subject: "Mathematics",
    level: "A-Level",
    module: "Statistics",
    summary: "Compare a statistic against a null model.",
  },
];

describe("catalogue helpers", () => {
  it("normalizes search queries case and accents", () => {
    expect(normalizeSearchQuery("  RÉSULTANT  ")).toBe("resultant");
  });

  it("filters by query and module without mutating caller containers", () => {
    const before = JSON.stringify(containers);
    const result = filterContainers(containers, "body", "Mechanics");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.map((container) => container.id)).toEqual(["physics/forces"]);
    expect(JSON.stringify(containers)).toBe(before);
  });

  it("treats selectedModule=all as no module filter", () => {
    const result = filterContainers(containers, "level", "all");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.map((container) => container.id))
      .toEqual(["physics/scalars", "physics/forces", "math/hypothesis"]);
  });

  it("rejects malformed containers instead of silently hiding them", () => {
    const malformed: SearchableContainer = {
      id: " bad",
      title: "Bad",
      subject: "Physics",
      level: "A-Level",
      module: "Mechanics",
      summary: "Malformed id.",
    };
    expect(filterContainers([malformed], "", "all").ok).toBe(false);
  });

  it("creates finite search summaries from numeric counts", () => {
    expect(searchResultSummary(2, 3)).toEqual({
      visible: 2,
      total: 3,
      label: "2 of 3 containers",
    });
    expect(searchResultSummary(Number.NaN, -1)).toEqual({
      visible: 0,
      total: 0,
      label: "0 of 0 containers",
    });
  });
});

describe("mastery helpers", () => {
  it("validates mastery statuses", () => {
    expect(masteryStatus("mastered")).toEqual({ ok: true, value: "mastered" });
    expect(masteryStatus("done").ok).toBe(false);
  });

  it("summarizes mastery records with a zero-safe percentage", () => {
    const mastery: MasteryRecord = {
      "physics/scalars": "mastered",
      "physics/forces": "practicing",
    };

    expect(masterySummary(containers, mastery)).toEqual({
      total: 3,
      notStarted: 1,
      practicing: 1,
      mastered: 1,
      percentMastered: 1 / 3,
    });
    expect(masterySummary([], mastery).percentMastered).toBe(0);
  });

  it("returns ready containers whose known prerequisites are mastered", () => {
    const prerequisites = new Map<string, readonly string[]>([
      ["physics/forces", ["physics/scalars"]],
      ["math/hypothesis", ["external/probability"]],
    ]);

    const result = nextReadyContainers(
      containers,
      prerequisites,
      { "physics/scalars": "mastered" },
      10,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.map((container: SearchableContainer) => container.id)).toEqual([
      "physics/forces",
      "math/hypothesis",
    ]);
  });

  it("rejects invalid ready-list limits and malformed containers", () => {
    expect(nextReadyContainers(containers, new Map(), {}, 0).ok).toBe(false);
    const malformed: SearchableContainer = {
      id: "physics/bad",
      title: "",
      subject: "Physics",
      level: "A-Level",
      module: "Mechanics",
      summary: "Missing title.",
    };
    expect(
      nextReadyContainers([malformed], new Map(), {}, 1).ok,
    ).toBe(false);
  });
});
