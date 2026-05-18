// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { degrees, newtons } from "@paideia/shared";
import { resolveVectorComponents } from "./resolving-vectors.js";
import { runResolvingVectorsGateContract } from "./resolving-vectors.contract.js";

describe("resolving-vectors sim", () => {
  it("resolves vectors into horizontal and vertical components", () => {
    const result30 = resolveVectorComponents(newtons(10), degrees(30));
    expect(result30.ok).toBe(true);
    if (!result30.ok) return;
    expect(result30.value.componentsNewtons[0]).toBeCloseTo(8.660254, 5);
    expect(result30.value.componentsNewtons[1]).toBeCloseTo(5, 12);
    expect(result30.value.magnitudeNewtons).toBeCloseTo(10, 12);

    const result0 = resolveVectorComponents(newtons(10), degrees(0));
    expect(result0.ok).toBe(true);
    if (!result0.ok) return;
    expect(result0.value.componentsNewtons[0]).toBeCloseTo(10, 12);
    expect(result0.value.componentsNewtons[1]).toBeCloseTo(0, 12);

    const result90 = resolveVectorComponents(newtons(10), degrees(90));
    expect(result90.ok).toBe(true);
    if (!result90.ok) return;
    expect(result90.value.componentsNewtons[0]).toBeCloseTo(0, 12);
    expect(result90.value.componentsNewtons[1]).toBeCloseTo(10, 12);
  });

  it("returns kernel errors for non-finite inputs", () => {
    const result = resolveVectorComponents(newtons(Number.NaN), degrees(30));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe("precondition-violated");
  });
});

runResolvingVectorsGateContract();
