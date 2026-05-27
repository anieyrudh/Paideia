import { describe, expect, it } from "vitest";

import { thermochemistryEvidence } from "./thermochemistry-and-equilibrium.js";

describe("thermochemistryEvidence", () => {
  it("returns heat and quotient evidence for valid classroom inputs", () => {
    const evidence = thermochemistryEvidence({
      finalTemperatureCelsius: 45,
      productConcentration: 1.2,
      reactantConcentration: 0.4,
    });

    expect(evidence.ok).toBe(true);
    if (!evidence.ok) return;
    expect(evidence.value.heatKilojoules).toBeCloseTo(8.368);
    expect(evidence.value.equilibriumQuotient).toBeCloseTo(3);
    expect(evidence.value.equilibriumBias).toBe("product-favoured");
  });

  it("returns a KernelResult error for invalid concentration input", () => {
    const evidence = thermochemistryEvidence({
      finalTemperatureCelsius: 45,
      productConcentration: 0,
      reactantConcentration: 0.4,
    });

    expect(evidence.ok).toBe(false);
    if (evidence.ok) return;
    expect(evidence.error.code).toBe("out-of-domain");
  });
});
