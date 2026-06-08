import { describe, expect, it } from "vitest";

describe("three-scene lazy entry", () => {
  it("exposes lazy component boundaries and colour helpers", async () => {
    const lazyEntry = await import("./lazy.js");

    expect(typeof lazyEntry.colourMapViridis).toBe("function");
    expect(typeof lazyEntry.colourMapPlasma).toBe("function");
    expect(lazyEntry.ThreeScene).toBeDefined();
    expect(lazyEntry.Surface3D).toBeDefined();
    expect(lazyEntry.ParametricCurve3DView).toBeDefined();
    expect(lazyEntry.VectorField3DView).toBeDefined();
    expect(lazyEntry.Molecule3D).toBeDefined();
    expect(lazyEntry.Axes3D).toBeDefined();
  });
});
