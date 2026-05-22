// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { createContainerEmbed } from "./index.js";

describe("graph algorithm explorer embed contract", () => {
  it("exposes lifecycle methods and round-trips learner state", async () => {
    const embed = createContainerEmbed();
    const firstTarget = document.createElement("section");
    const secondTarget = document.createElement("section");

    expect(embed.load).toBeTypeOf("function");
    expect(embed.saveState).toBeTypeOf("function");
    expect(embed.score).toBeTypeOf("function");
    expect(embed.resume).toBeTypeOf("function");
    expect(embed.syncTheme).toBeTypeOf("function");
    expect(embed.destroy).toBeTypeOf("function");

    await embed.load(firstTarget);
    embed.syncTheme({ colorScheme: "dark", accentColor: "#2563eb" });
    expect(firstTarget.getAttribute("data-paideia-theme")).toBe("dark");
    expect(firstTarget.getAttribute("data-paideia-accent")).toBe("#2563eb");

    embed.resume({
      predictionCommitted: true,
      algorithmMode: "dijkstra",
      graphScenario: "tie-order",
    });
    const saved = embed.saveState();
    expect(saved).toEqual({
      predictionCommitted: true,
      algorithmMode: "dijkstra",
      graphScenario: "tie-order",
    });
    Reflect.set(saved, "algorithmMode", "dfs");
    expect(embed.saveState().algorithmMode).toBe("dijkstra");
    expect(embed.score()).toEqual({
      completed: true,
      predictionCommitted: true,
      score: 1,
    });

    await embed.load(secondTarget);
    expect(firstTarget.hasAttribute("data-paideia-theme")).toBe(false);
    expect(firstTarget.hasAttribute("data-paideia-accent")).toBe(false);
    embed.syncTheme({ colorScheme: "light" });
    expect(secondTarget.getAttribute("data-paideia-theme")).toBe("light");
    expect(secondTarget.hasAttribute("data-paideia-accent")).toBe(false);

    embed.destroy();
    expect(secondTarget.hasAttribute("data-paideia-theme")).toBe(false);
    expect(embed.saveState()).toEqual({
      predictionCommitted: false,
      algorithmMode: "bfs",
      graphScenario: "weighted-detour",
    });
  });

  it("rejects invalid host-provided state and theme values", () => {
    const embed = createContainerEmbed();

    expect(() =>
      embed.resume({
        predictionCommitted: true,
        algorithmMode: "astar" as never,
        graphScenario: "weighted-detour",
      }),
    ).toThrow();
    expect(() =>
      embed.resume({
        predictionCommitted: true,
        algorithmMode: "bfs",
        graphScenario: "random" as never,
      }),
    ).toThrow();
    expect(() => embed.syncTheme({ colorScheme: "contrast" } as never)).toThrow();
  });
});
