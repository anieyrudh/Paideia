import { describe, expect, it } from "vitest";
import { discreteRvsModel } from "./discrete-rvs-geometric-binomial-poisson.js";

const unwrap = <T>(result: { ok: true; value: T } | { ok: false }): T => {
  if (!result.ok) throw new Error("expected ok result");
  return result.value;
};

describe("discreteRvsModel", () => {
  it("computes binomial moments through the probability kernel", () => {
    const model = unwrap(discreteRvsModel({ model: "binomial", n: 8, p: 0.35 }));
    expect(model.mean).toBeCloseTo(2.8, 8);
    expect(model.variance).toBeCloseTo(1.82, 8);
    expect(model.tailProbability).toBeGreaterThan(0.25);
  });

  it("distinguishes geometric waiting time from fixed trial count", () => {
    const model = unwrap(discreteRvsModel({ model: "geometric", p: 0.25 }));
    expect(model.mean).toBeGreaterThan(3.5);
    expect(model.targetEvent).toContain("first success");
  });

  it("computes Poisson count evidence from the event rate", () => {
    const model = unwrap(discreteRvsModel({ model: "poisson", lambda: 4 }));
    expect(model.mean).toBeCloseTo(4, 2);
    expect(model.variance).toBeCloseTo(4, 1);
  });
});
