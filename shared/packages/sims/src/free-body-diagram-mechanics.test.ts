// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { newtons } from "@paideia/shared";
import { forceBalanceModel } from "./free-body-diagram-mechanics.js";

describe("free-body-diagram-mechanics sim", () => {
  it("detects balanced forces when net force is zero", () => {
    const result = forceBalanceModel({
      supportRightNewtons: newtons(6),
      supportUpNewtons: newtons(5),
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.net.x).toBeCloseTo(0, 12);
    expect(result.value.net.y).toBeCloseTo(0, 12);
    expect(result.value.isEquilibrium).toBe(true);
  });

  it("reports the resultant direction when support is unbalanced", () => {
    const result = forceBalanceModel({
      supportRightNewtons: newtons(8),
      supportUpNewtons: newtons(3),
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.net.x).toBeCloseTo(2, 12);
    expect(result.value.net.y).toBeCloseTo(-2, 12);
    expect(result.value.isEquilibrium).toBe(false);
  });
});
