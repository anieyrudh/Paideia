import { describe, expect, it } from "vitest";
import { defaultState, score } from "./api.js";

describe("polymers embed API", () => {
  it("scores a committed prediction with inspected reuse evidence", () => {
    expect(score(defaultState(), true)).toEqual({
      completion: 1,
      predictionCommitted: true,
      evidenceInspected: true,
    });
  });
});
