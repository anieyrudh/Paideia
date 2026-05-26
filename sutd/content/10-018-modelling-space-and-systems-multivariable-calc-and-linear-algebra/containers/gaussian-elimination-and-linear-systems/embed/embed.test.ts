import { describe, expect, it } from "vitest";
import { load, resume, saveState, score } from "./index";

describe("gaussian-elimination embed API", () => {
  it("loads, resumes, saves, and scores state", () => {
    const loaded = load();
    const resumed = resume({ ...loaded, a: 1 });
    expect(saveState(resumed)).toEqual(resumed);
    expect(score(loaded).uniqueDefaultRecognised).toBe(true);
    expect(score(resumed).evidenceRevealed).toBe(true);
  });
});
