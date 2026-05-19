import { describe, expect, it } from "vitest";
import { odePhasePortraitEvidence } from "./ode-phase-portrait.js";

describe("ODE phase portrait evidence", () => {
  it("classifies the default trace-determinant system as a stable spiral", () => {
    const evidence = odePhasePortraitEvidence({
      preset: "stable-spiral",
      trace: -0.6,
      determinant: 1.2,
      initialX: 1.4,
      initialY: 0,
    });

    expect(evidence.ok).toBe(true);
    if (evidence.ok) {
      expect(evidence.value.stability.kind).toBe("stable-spiral");
      expect(evidence.value.stability.trace).toBeCloseTo(-0.6);
      expect(evidence.value.stability.determinant).toBeCloseTo(1.2);
      expect(evidence.value.trajectory.length).toBeGreaterThan(50);
    }
  });

  it("keeps saddle classification in the shared dynamical-systems result", () => {
    const evidence = odePhasePortraitEvidence({
      preset: "saddle",
      trace: 0.2,
      determinant: -0.8,
      initialX: 0.9,
      initialY: 0.8,
    });

    expect(evidence.ok).toBe(true);
    if (evidence.ok) {
      expect(evidence.value.stability.kind).toBe("saddle");
    }
  });
});
