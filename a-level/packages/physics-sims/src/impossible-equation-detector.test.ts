// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import {
  analyseEquation,
  formatDimension,
  multiplyDimensions,
} from "./impossible-equation-detector.js";
import { runImpossibleEquationDetectorGateContract } from "./impossible-equation-detector.contract.js";

describe("impossible-equation-detector sim", () => {
  it("flags only the velocity equation with a displacement-sized term", () => {
    expect(analyseEquation("velocity-update").consistent).toBe(true);
    expect(analyseEquation("displacement").consistent).toBe(true);
    expect(analyseEquation("velocity-area").consistent).toBe(false);
    expect(analyseEquation("force-law").consistent).toBe(true);
  });

  it("multiplies dimensions by adding base exponents", () => {
    expect(formatDimension(multiplyDimensions({ M: 0, L: 1, T: -2 }, { M: 0, L: 0, T: 2 }))).toBe("L");
    expect(formatDimension(multiplyDimensions({ M: 1, L: 0, T: 0 }, { M: 0, L: 1, T: -2 }))).toBe("M L T^-2");
  });
});

runImpossibleEquationDetectorGateContract();
