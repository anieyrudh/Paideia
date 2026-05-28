import { describe, expect, it } from "vitest";
import { createContainerEmbed } from "./index.js";

describe("scheduling project embed", () => {
  it("supports the canonical embed lifecycle", async () => {
    const target = document.createElement("div");
    const embed = createContainerEmbed();
    await embed.load(target);
    expect(target.getAttribute("data-paideia-embed")).toBe("scheduling-and-project-management");
    expect(embed.score().score).toBe(0);
    embed.resume({ predictionCommitted: true, prototype: 9, tooling: 6, training: 8 });
    expect(embed.saveState().prototype).toBe(9);
    expect(embed.score().score).toBe(1);
    embed.syncTheme({ colorScheme: "dark" });
    expect(target.getAttribute("data-paideia-theme")).toBe("dark");
    embed.destroy();
    expect(target.getAttribute("data-paideia-embed")).toBeNull();
  });
});
