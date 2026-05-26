import { describe, expect, it } from "vitest";
import { load, resume, saveState, score } from "./index";

describe("line-integrals embed API", () => {
  it("loads, resumes, saves, and scores state", () => {
    const loaded = load();
    const resumed = resume({ ...loaded, fieldKind: "rotational" });
    expect(saveState(resumed)).toEqual(resumed);
    expect(score(loaded).pathIndependenceRecognised).toBe(true);
    expect(score(resumed).pathIndependenceRecognised).toBe(false);
  });
});
