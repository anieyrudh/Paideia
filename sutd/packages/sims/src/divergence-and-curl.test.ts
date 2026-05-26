import { approxEqual } from "@paideia/shared";
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { divergenceCurlEvidence } from "./divergence-and-curl";

describe("divergenceCurlEvidence", () => {
  it("classifies generated linear field diagnostics", () => {
    fc.assert(
      fc.property(
        fc.record({
          fieldKind: fc.constantFrom<"source" | "sink" | "vortex" | "shear">(
            "source",
            "sink",
            "vortex",
            "shear",
          ),
          sampleX: fc.double({ min: -1.5, max: 1.5, noDefaultInfinity: true, noNaN: true }),
          sampleY: fc.double({ min: -1.5, max: 1.5, noDefaultInfinity: true, noNaN: true }),
          strength: fc.double({ min: 0.5, max: 2, noDefaultInfinity: true, noNaN: true }),
        }),
        ({ fieldKind, sampleX, sampleY, strength }) => {
          const result = divergenceCurlEvidence({ fieldKind, sampleX, sampleY, strength });
          expect(result.ok).toBe(true);
          if (!result.ok) return;

          const expected =
            fieldKind === "source"
              ? { divergence: 2 * strength, curl: 0 }
              : fieldKind === "sink"
                ? { divergence: -2 * strength, curl: 0 }
                : fieldKind === "vortex"
                  ? { divergence: 0, curl: 2 * strength }
                  : { divergence: 0, curl: -strength };

          expect(approxEqual(result.value.divergence, expected.divergence, 1e-4)).toBe(true);
          expect(approxEqual(result.value.curl, expected.curl, 1e-4)).toBe(true);
        },
      ),
      { seed: 18020, numRuns: 50, verbose: true },
    );
  });
});
