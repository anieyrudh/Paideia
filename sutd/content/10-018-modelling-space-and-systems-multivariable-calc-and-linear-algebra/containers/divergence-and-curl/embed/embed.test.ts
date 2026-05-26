import { describe, expect, it } from "vitest";
import { load, resume, saveState, score } from "./index";

describe("divergence-and-curl embed API", () => {
  it("loads, resumes, saves, and scores state", () => {
    const loaded = load();
    const resumed = resume({ ...loaded, fieldKind: "sink" });
    expect(saveState(resumed)).toEqual(resumed);
    expect(score(loaded).diagnosticContrastVisible).toBe(true);
    expect(score(resumed).evidenceRevealed).toBe(true);
  });
});
