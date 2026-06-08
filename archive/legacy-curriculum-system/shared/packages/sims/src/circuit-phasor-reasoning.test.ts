// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { circuitPhasorModel } from "./circuit-phasor-reasoning.js";

describe("circuit-phasor-reasoning sim", () => {
  it("identifies inductive circuits as lagging current", () => {
    const result = circuitPhasorModel({
      sourceVoltageRmsVolts: 12,
      frequencyHertz: 50,
      resistanceOhms: 40,
      inductanceMilliHenrys: 220,
      capacitanceMicroFarads: 220,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.regime).toBe("inductive");
    expect(result.value.solution.currentPhaseRadians).toBeLessThan(0);
    expect(result.value.solution.currentRmsAmps).toBeGreaterThan(0);
  });

  it("identifies capacitive circuits as leading current", () => {
    const result = circuitPhasorModel({
      sourceVoltageRmsVolts: 12,
      frequencyHertz: 50,
      resistanceOhms: 40,
      inductanceMilliHenrys: 60,
      capacitanceMicroFarads: 120,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.regime).toBe("capacitive");
    expect(result.value.solution.currentPhaseRadians).toBeGreaterThan(0);
  });
});
