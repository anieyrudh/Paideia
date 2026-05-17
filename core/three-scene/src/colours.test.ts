import { describe, expect, it } from "vitest";
import { colourMapPlasma, colourMapViridis } from "./colours.js";

describe("three-scene colour maps", () => {
  it("returns CSS hex colours and clamps out-of-range inputs", () => {
    expect(colourMapViridis(0)).toMatch(/^#[0-9a-f]{6}$/u);
    expect(colourMapPlasma(1)).toMatch(/^#[0-9a-f]{6}$/u);
    expect(colourMapViridis(-1)).toBe(colourMapViridis(0));
    expect(colourMapPlasma(2)).toBe(colourMapPlasma(1));
  });

  it("varies colour across the unit interval", () => {
    expect(colourMapViridis(0)).not.toBe(colourMapViridis(1));
    expect(colourMapPlasma(0)).not.toBe(colourMapPlasma(1));
  });
});
