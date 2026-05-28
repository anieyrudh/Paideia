import { describe, expect, it } from "vitest";
import { createContainerEmbed } from "./index.js";

describe("discrete RV embed", () => {
  it("supports the canonical embed lifecycle", async () => {
    const target = document.createElement("div");
    const embed = createContainerEmbed();
    await embed.load(target);
    expect(target.getAttribute("data-paideia-embed")).toBe("discrete-rvs-geometric-binomial-poisson");
    embed.resume({ predictionCommitted: true, model: "poisson", p: 0.35, n: 8, lambda: 4 });
    expect(embed.score().score).toBe(1);
    embed.syncTheme({ colorScheme: "dark" });
    expect(target.getAttribute("data-paideia-theme")).toBe("dark");
    embed.destroy();
    expect(target.getAttribute("data-paideia-embed")).toBeNull();
  });
});
