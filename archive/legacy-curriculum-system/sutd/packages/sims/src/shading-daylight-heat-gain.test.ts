// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { degrees, metres } from "@paideia/shared";
import { glazingRatio, shadingDaylightHeatGainModel } from "./shading-daylight-heat-gain.js";

describe("shading-daylight-heat-gain sim", () => {
  it("deeper overhang lowers direct heat gain for the same facade", () => {
    const shallow = shadingDaylightHeatGainModel({
      overhangDepthM: metres(0.3),
      glazingRatio: glazingRatio(0.65),
      solarAltitudeDeg: degrees(45),
      facadeOrientation: "south",
    });
    const deep = shadingDaylightHeatGainModel({
      overhangDepthM: metres(1.4),
      glazingRatio: glazingRatio(0.65),
      solarAltitudeDeg: degrees(45),
      facadeOrientation: "south",
    });

    expect(shallow.ok).toBe(true);
    expect(deep.ok).toBe(true);
    if (!shallow.ok || !deep.ok) return;
    expect(deep.value.shadedFraction).toBeGreaterThan(shallow.value.shadedFraction);
    expect(deep.value.heatGainW).toBeLessThan(shallow.value.heatGainW);
  });

  it("larger glazing raises daylight and glass area when shade is unchanged", () => {
    const narrow = shadingDaylightHeatGainModel({
      overhangDepthM: metres(0.8),
      glazingRatio: glazingRatio(0.4),
      solarAltitudeDeg: degrees(50),
      facadeOrientation: "east",
    });
    const wide = shadingDaylightHeatGainModel({
      overhangDepthM: metres(0.8),
      glazingRatio: glazingRatio(0.8),
      solarAltitudeDeg: degrees(50),
      facadeOrientation: "east",
    });

    expect(narrow.ok).toBe(true);
    expect(wide.ok).toBe(true);
    if (!narrow.ok || !wide.ok) return;
    expect(wide.value.daylightScore).toBeGreaterThan(narrow.value.daylightScore);
    expect(wide.value.glassAreaM2).toBeGreaterThan(narrow.value.glassAreaM2);
  });

  it("does not expose the caller state by mutable reference", () => {
    const state = {
      overhangDepthM: metres(0.8),
      glazingRatio: glazingRatio(0.6),
      solarAltitudeDeg: degrees(45),
      facadeOrientation: "south" as const,
    };
    const evidence = shadingDaylightHeatGainModel(state);

    expect(evidence.ok).toBe(true);
    if (!evidence.ok) return;

    const mutableState = state as { facadeOrientation: "south" | "west" };
    mutableState.facadeOrientation = "west";
    expect(evidence.value.state.facadeOrientation).toBe("south");
  });
});
