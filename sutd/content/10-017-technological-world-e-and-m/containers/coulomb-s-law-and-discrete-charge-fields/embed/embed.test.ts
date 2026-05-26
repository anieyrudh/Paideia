import { describe, expect, it } from "vitest";
import { createContainerEmbed } from "./index.js";

describe("coulomb embed contract", () => {
  it("round-trips state and score through zod schemas", async () => {
    const embed = createContainerEmbed();
    const target = document.createElement("section");
    await embed.load(target);
    expect(embed.score()).toEqual({ completed: false, predictionCommitted: false, score: 0 });
    embed.resume({ predictionCommitted: true });
    expect(embed.saveState()).toEqual({ predictionCommitted: true });
    expect(embed.score()).toEqual({ completed: true, predictionCommitted: true, score: 1 });
    embed.syncTheme({ colorScheme: "dark" });
    expect(target.getAttribute("data-paideia-theme")).toBe("dark");
    embed.destroy();
    expect(target.hasAttribute("data-paideia-theme")).toBe(false);
  });
});
