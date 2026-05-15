import { describe, expect, it, beforeEach } from "vitest";
import type { TPredictSpec } from "@paideia/content-schema";
import {
  clearPrediction,
  commitPrediction,
  isRevealed,
  type PredictionScope,
} from "./index.js";
import {
  hasStoredPrediction,
  predictionStorageKey,
  readStoredPrediction,
  type StorageLike,
} from "./storage.js";
import { validatePrediction } from "./validation.js";

class MemoryStorage implements StorageLike {
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

const installStorage = (): MemoryStorage => {
  const storage = new MemoryStorage();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: storage,
  });
  return storage;
};

const rankingPredict: TPredictSpec = {
  prompt: "Rank the outcomes before revealing the graph.",
  commit_format: {
    kind: "ranking",
    options: ["increases", "stays-same", "decreases"],
  },
  rationale_required: true,
};

const multipleChoicePredict: TPredictSpec = {
  prompt: "Choose the direction before revealing the vector.",
  commit_format: {
    kind: "multiple-choice",
    options: ["left", "right"],
  },
  rationale_required: false,
};

describe("@paideia/prediction-gate storage", () => {
  beforeEach(() => {
    installStorage();
  });

  it("blocks reveal until a commit is recorded", () => {
    expect(isRevealed("pkg", "package")).toBe(false);
    const result = commitPrediction("pkg", "package", {
      value: "left",
      rationale: "Initial intuition",
    });
    expect(result.ok).toBe(true);
    expect(isRevealed("pkg", "package")).toBe(true);
  });

  it("clears only through explicit clearPrediction", () => {
    expect(commitPrediction("pkg", "sim-a", { value: 3, rationale: "" }).ok).toBe(true);
    expect(isRevealed("pkg", "sim-a")).toBe(true);
    clearPrediction("pkg", "sim-a");
    expect(isRevealed("pkg", "sim-a")).toBe(false);
  });

  it("scopes storage by package and sim", () => {
    expect(commitPrediction("pkg-a", "package", { value: 1, rationale: "" }).ok).toBe(true);
    expect(isRevealed("pkg-a", "package")).toBe(true);
    expect(isRevealed("pkg-a", "sim-a")).toBe(false);
    expect(isRevealed("pkg-b", "package")).toBe(false);
  });

  it("derives the canonical localStorage key", () => {
    const scope: PredictionScope = "package";
    expect(predictionStorageKey("simple-harmonic-motion", scope)).toBe(
      "paideia.predict.simple-harmonic-motion.package",
    );
  });

  it("rejects malformed stored JSON through the Zod storage schema", () => {
    const storage = new MemoryStorage();
    storage.setItem(predictionStorageKey("pkg", "package"), "{bad");
    expect(readStoredPrediction("pkg", "package", storage)).toBeNull();
    expect(hasStoredPrediction("pkg", "package", storage)).toBe(false);
  });
});

describe("validatePrediction", () => {
  it("rejects missing rationale when required", () => {
    const result = validatePrediction(rankingPredict, {
      value: ["increases", "stays-same", "decreases"],
      rationale: " ",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("precondition-violated");
  });

  it("accepts a complete ranking using listed options exactly once", () => {
    const result = validatePrediction(rankingPredict, {
      value: ["decreases", "stays-same", "increases"],
      rationale: "Comparing slope direction first.",
    });
    expect(result.ok).toBe(true);
  });

  it("rejects ranking options outside the declared list", () => {
    const result = validatePrediction(rankingPredict, {
      value: ["decreases", "unknown", "increases"],
      rationale: "Comparing slope direction first.",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("out-of-domain");
  });

  it("accepts only listed multiple-choice options", () => {
    expect(validatePrediction(multipleChoicePredict, { value: "left" }).ok).toBe(true);
    const result = validatePrediction(multipleChoicePredict, { value: "up" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("out-of-domain");
  });

  it("requires value predictions to be finite numbers", () => {
    const predict: TPredictSpec = {
      prompt: "Estimate the period before reveal.",
      commit_format: { kind: "value", unit: "seconds" },
      rationale_required: false,
    };
    expect(validatePrediction(predict, { value: 2.5 }).ok).toBe(true);
    const result = validatePrediction(predict, { value: Number.NaN });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("out-of-domain");
  });

  it("bounds freetext by the PredictSpec max_length", () => {
    const predict: TPredictSpec = {
      prompt: "Write your qualitative prediction.",
      commit_format: { kind: "freetext", max_length: 5 },
      rationale_required: false,
    };
    expect(validatePrediction(predict, { value: "short" }).ok).toBe(true);
    const result = validatePrediction(predict, { value: "too long" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("out-of-domain");
  });
});
