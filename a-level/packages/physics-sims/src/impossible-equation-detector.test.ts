// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import {
  analyzeEquation,
  equationCases,
  formatDimension,
} from "./impossible-equation-detector.js";
import { runImpossibleEquationDetectorGateContract } from "./impossible-equation-detector.contract.js";

const byId = (id: string) => {
  const equation = equationCases.find((candidate) => candidate.id === id);
  if (equation === undefined) throw new Error(`Missing equation case ${id}`);
  return equation;
};

describe("impossible-equation-detector model", () => {
  it("flags addition of unlike dimensions as impossible", () => {
    const analysis = analyzeEquation(byId("distance-speed-plus-acceleration"));

    expect(analysis.consistent).toBe(false);
    expect(analysis.issue).toContain("L T^-2 is not L T^-1");
  });

  it("accepts mass times acceleration as force", () => {
    const analysis = analyzeEquation(byId("force-mass-acceleration"));

    expect(analysis.consistent).toBe(true);
    expect(formatDimension(analysis.rightDimension)).toBe("M L T^-2");
  });

  it("catches scalar-vector mismatches even when units match", () => {
    const analysis = analyzeEquation(byId("displacement-speed-time"));

    expect(analysis.consistent).toBe(false);
    expect(analysis.issue).toContain("scalar expression cannot stand in for a vector quantity");
  });
});

runImpossibleEquationDetectorGateContract();
