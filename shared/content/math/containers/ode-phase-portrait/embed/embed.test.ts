// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { createContainerEmbed } from "./index.js";

describe("ODE phase portrait embed contract", () => {
  it("exposes lifecycle methods and round-trips learner state", async () => {
    const api = createContainerEmbed();
    const firstTarget = document.createElement("div");
    const secondTarget = document.createElement("div");

    expect(api.load).toBeTypeOf("function");
    expect(api.saveState).toBeTypeOf("function");
    expect(api.score).toBeTypeOf("function");
    expect(api.resume).toBeTypeOf("function");
    expect(api.syncTheme).toBeTypeOf("function");
    expect(api.destroy).toBeTypeOf("function");

    await api.load(firstTarget);
    api.syncTheme({ colorScheme: "dark", accentColor: "#245c7a" });
    expect(firstTarget.dataset.paideiaContainer).toBe("ode-phase-portrait");
    expect(firstTarget.dataset.paideiaTheme).toBe("dark");
    expect(firstTarget.dataset.paideiaAccent).toBe("#245c7a");

    expect(api.saveState()).toEqual({
      predictionCommitted: false,
      preset: "stable-spiral",
      trace: -0.6,
      determinant: 1.2,
      initialX: 1.4,
      initialY: 0,
    });

    api.resume({
      predictionCommitted: true,
      preset: "saddle",
      trace: 0.2,
      determinant: -0.8,
      initialX: 0.9,
      initialY: 0.8,
    });
    const saved = api.saveState();
    expect(saved).toEqual({
      predictionCommitted: true,
      preset: "saddle",
      trace: 0.2,
      determinant: -0.8,
      initialX: 0.9,
      initialY: 0.8,
    });
    Reflect.set(saved, "trace", 99);
    expect(api.saveState().trace).toBe(0.2);
    expect(api.score()).toEqual({ completed: true, predictionCommitted: true, score: 1 });

    await api.load(secondTarget);
    expect(firstTarget.hasAttribute("data-paideia-container")).toBe(false);
    expect(firstTarget.hasAttribute("data-paideia-theme")).toBe(false);
    api.syncTheme({ colorScheme: "light" });
    expect(secondTarget.dataset.paideiaTheme).toBe("light");
    expect(secondTarget.hasAttribute("data-paideia-accent")).toBe(false);

    api.destroy();
    expect(api.score().completed).toBe(false);
    expect(secondTarget.hasAttribute("data-paideia-container")).toBe(false);
  });

  it("rejects invalid host-provided state and theme values", () => {
    const api = createContainerEmbed();

    expect(() =>
      api.resume({
        predictionCommitted: true,
        preset: "invalid" as never,
        trace: 0,
        determinant: 1,
        initialX: 0,
        initialY: 0,
      }),
    ).toThrow();
    expect(() =>
      api.resume({
        predictionCommitted: true,
        preset: "center",
        trace: Number.NaN,
        determinant: 1,
        initialX: 0,
        initialY: 0,
      }),
    ).toThrow();
    expect(() => api.syncTheme({ colorScheme: "contrast" } as never)).toThrow();
  });
});
