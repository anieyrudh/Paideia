import { clearPrediction, commitPrediction, isRevealed } from "@paideia/prediction-gate";
import { describe, expect, it } from "vitest";
import {
  analyzeMarkovSteadyState,
  markovChainSteadyStatePackageId,
} from "./markov-chain-steady-state.js";

class MemoryStorage {
  private readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }
}

const installStorage = (): void => {
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: new MemoryStorage(),
  });
};

describe("markov chain steady state analysis", () => {
  it("keeps steady-state evidence blocked until prediction commit", () => {
    installStorage();
    clearPrediction(markovChainSteadyStatePackageId, "markov-chain-steady-state");

    expect(isRevealed(markovChainSteadyStatePackageId, "markov-chain-steady-state")).toBe(false);
    const committed = commitPrediction(
      markovChainSteadyStatePackageId,
      "markov-chain-steady-state",
      {
        value: "Toward more congested weeks",
        rationale: "Recovery from congestion is weaker than staying smooth, so congestion persists.",
      },
    );

    expect(committed.ok).toBe(true);
    expect(isRevealed(markovChainSteadyStatePackageId, "markov-chain-steady-state")).toBe(true);
  });

  it("computes the steady distribution from the transition probabilities", () => {
    const analysis = analyzeMarkovSteadyState({
      smoothStaysSmooth: 0.84,
      congestedRecovers: 0.38,
      initialSmooth: 0.72,
      weeks: 10,
    });

    expect(analysis.ok).toBe(true);
    if (analysis.ok) {
      expect(analysis.value.steadySmooth).toBeCloseTo(0.38 / (0.38 + 0.16));
      expect(analysis.value.steadyCongested).toBeCloseTo(0.16 / (0.38 + 0.16));
      expect(analysis.value.eigenSmooth).toBeCloseTo(analysis.value.steadySmooth);
      expect(analysis.value.steadySmooth + analysis.value.steadyCongested).toBeCloseTo(1);
    }
  });

  it("moves the steady state toward smooth weeks when recovery improves", () => {
    const sticky = analyzeMarkovSteadyState({
      smoothStaysSmooth: 0.78,
      congestedRecovers: 0.18,
      initialSmooth: 0.65,
      weeks: 12,
    });
    const fastRecovery = analyzeMarkovSteadyState({
      smoothStaysSmooth: 0.78,
      congestedRecovers: 0.58,
      initialSmooth: 0.65,
      weeks: 12,
    });

    expect(sticky.ok).toBe(true);
    expect(fastRecovery.ok).toBe(true);
    if (sticky.ok && fastRecovery.ok) {
      expect(fastRecovery.value.steadySmooth).toBeGreaterThan(sticky.value.steadySmooth);
      expect(fastRecovery.value.steadyCongested).toBeLessThan(sticky.value.steadyCongested);
    }
  });

  it("repeated updates converge close to the steady state", () => {
    const analysis = analyzeMarkovSteadyState({
      smoothStaysSmooth: 0.84,
      congestedRecovers: 0.38,
      initialSmooth: 0.05,
      weeks: 20,
    });

    expect(analysis.ok).toBe(true);
    if (analysis.ok) {
      const final = analysis.value.trajectory.at(-1);
      expect(final).toBeDefined();
      if (final !== undefined) {
        expect(final.smooth).toBeCloseTo(analysis.value.steadySmooth, 3);
        expect(final.congested).toBeCloseTo(analysis.value.steadyCongested, 3);
      }
    }
  });
});
