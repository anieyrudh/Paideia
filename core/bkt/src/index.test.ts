import { describe, expect, it } from "vitest";
import { probability, type ConceptId } from "@paideia/shared";
import {
  defaultParameters,
  fitParameters,
  predictMastery,
  updateMastery,
  type Evidence,
  type MasteryState,
} from "./index.js";

const conceptId = "photosynthesis" as ConceptId;

const p = (value: number) => {
  const result = probability(value);
  if (!result.ok) throw new Error(`Invalid test probability ${value}`);
  return result.value;
};

const state = (pMastery: number): MasteryState => ({
  conceptId,
  pMastery: p(pMastery),
  evidenceCount: 0,
  lastUpdated: new Date("2026-01-01T00:00:00.000Z"),
});

const evidence = (correct: boolean, day: number): Evidence => ({
  conceptId,
  correct,
  observedAt: new Date(Date.UTC(2026, 0, day)),
  itemId: `item-${day}`,
});

describe("@paideia/bkt", () => {
  it("raises mastery after correct evidence", () => {
    const prior = state(0.3);
    const result = updateMastery(prior, evidence(true, 2));

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.pMastery).toBeGreaterThan(prior.pMastery);
      expect(result.value.evidenceCount).toBe(1);
      expect(result.value.lastUpdated.toISOString()).toBe(
        "2026-01-02T00:00:00.000Z",
      );
    }
  });

  it("moves mastery down on incorrect evidence before applying learning", () => {
    const prior = state(0.8);
    const result = updateMastery(prior, evidence(false, 2));

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.pMastery).toBeLessThan(prior.pMastery);
      expect(result.value.pMastery).toBeGreaterThan(0);
    }
  });

  it("is deterministic for the same prior, evidence, and parameters", () => {
    const prior = state(0.42);
    const observed = evidence(true, 4);

    const first = updateMastery(prior, observed, defaultParameters);
    const second = updateMastery(prior, observed, defaultParameters);

    expect(first).toEqual(second);
  });

  it("predicts next-answer correctness from mastery, slip, and guess", () => {
    expect(predictMastery(state(1))).toBeCloseTo(0.9);
    expect(predictMastery(state(0))).toBeCloseTo(0.2);
  });

  it("rejects evidence for a different concept", () => {
    const result = updateMastery(state(0.3), {
      ...evidence(true, 2),
      conceptId: "cellular-respiration" as ConceptId,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("precondition-violated");
  });

  it("fits auditable parameters from a deterministic evidence sequence", () => {
    const history = [
      evidence(false, 1),
      evidence(false, 2),
      evidence(true, 3),
      evidence(true, 4),
      evidence(true, 5),
    ];

    const result = fitParameters(history);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.pInit).toBeGreaterThanOrEqual(0);
      expect(result.value.pInit).toBeLessThanOrEqual(1);
      expect(result.value.pLearn).toBeGreaterThan(0);
      expect(result.value.pSlip).toBeGreaterThanOrEqual(0);
      expect(result.value.pGuess).toBeGreaterThanOrEqual(0);
    }
  });

  it("requires enough evidence to fit parameters", () => {
    const result = fitParameters([evidence(true, 1)]);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("precondition-violated");
  });
});
