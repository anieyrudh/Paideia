import { describe, expect, it } from "vitest";
import { defaultState, score } from "./api.js";

describe("electrochemistry embed API", () => {
  it("scores a committed prediction with valid cell state", () => {
    expect(score(defaultState(), true)).toEqual({
      completion: 1,
      predictionCommitted: true,
      evidenceInspected: true,
    });
  });
});
