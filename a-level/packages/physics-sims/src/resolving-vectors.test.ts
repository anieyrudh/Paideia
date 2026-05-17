// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { resolveVectorComponents } from "./resolving-vectors.js";
import { runResolvingVectorsGateContract } from "./resolving-vectors.contract.js";

describe("resolving-vectors sim", () => {
  it("resolves vectors into horizontal and vertical components", () => {
    const [x30, y30] = resolveVectorComponents(10, 30);
    expect(x30).toBeCloseTo(8.660254, 5);
    expect(y30).toBeCloseTo(5, 12);

    const [x0, y0] = resolveVectorComponents(10, 0);
    expect(x0).toBeCloseTo(10, 12);
    expect(y0).toBeCloseTo(0, 12);

    const [x90, y90] = resolveVectorComponents(10, 90);
    expect(x90).toBeCloseTo(0, 12);
    expect(y90).toBeCloseTo(10, 12);
  });
});

runResolvingVectorsGateContract();
