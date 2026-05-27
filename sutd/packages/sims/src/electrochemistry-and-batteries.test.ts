import { describe, expect, it } from "vitest";

import { batteryEvidence } from "./electrochemistry-and-batteries.js";

describe("batteryEvidence", () => {
  it("computes cell voltage and load power for a valid battery state", () => {
    const result = batteryEvidence({
      standardPotentialVolts: 1.1,
      reactionQuotient: 20,
      electronCount: 2,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.cellPotentialVolts).toBeCloseTo(1.0615, 3);
    expect(result.value.voltageDropVolts).toBeCloseTo(0.0385, 3);
    expect(result.value.loadPowerWatts).toBeCloseTo(0.2654, 3);
  });

  it("returns a KernelResult error for invalid direct state input", () => {
    const result = batteryEvidence({
      standardPotentialVolts: 1.1,
      reactionQuotient: Number.NaN,
      electronCount: 2,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("out-of-domain");
  });
});
