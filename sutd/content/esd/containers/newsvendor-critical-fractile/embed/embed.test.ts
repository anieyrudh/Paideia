import { describe, expect, it } from "vitest";
import { createContainerEmbed } from "./index.js";

class HostElement {
  private readonly attributes = new Map<string, string>();

  getAttribute(name: string): string | null {
    return this.attributes.get(name) ?? null;
  }

  hasAttribute(name: string): boolean {
    return this.attributes.has(name);
  }

  removeAttribute(name: string): void {
    this.attributes.delete(name);
  }

  setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
  }
}

describe("newsvendor critical fractile embed API", () => {
  it("loads, themes, scores, resumes, and destroys without leaking host state", async () => {
    const host = new HostElement();
    const embed = createContainerEmbed();

    await embed.load(host as unknown as Element);
    embed.syncTheme({ colorScheme: "dark", accentColor: "#155e63" });
    expect(host.getAttribute("data-paideia-theme")).toBe("dark");
    expect(host.getAttribute("data-paideia-accent")).toBe("#155e63");
    embed.syncTheme({ colorScheme: "light" });
    expect(host.getAttribute("data-paideia-theme")).toBe("light");
    expect(host.hasAttribute("data-paideia-accent")).toBe(false);

    const nextHost = new HostElement();
    embed.syncTheme({ colorScheme: "dark", accentColor: "#155e63" });
    await embed.load(nextHost as unknown as Element);
    expect(host.hasAttribute("data-paideia-theme")).toBe(false);
    expect(host.hasAttribute("data-paideia-accent")).toBe(false);

    expect(embed.score()).toEqual({
      completed: false,
      predictionCommitted: false,
      score: 0,
    });

    embed.resume({
      predictionCommitted: true,
      scenario: "launch",
      orderQuantity: 130,
      underageCost: 26,
      overageCost: 5,
    });
    const state = embed.saveState();
    expect(state).toEqual({
      predictionCommitted: true,
      scenario: "launch",
      orderQuantity: 130,
      underageCost: 26,
      overageCost: 5,
    });
    expect(embed.score().score).toBe(1);

    embed.destroy();
    expect(host.hasAttribute("data-paideia-theme")).toBe(false);
    expect(host.hasAttribute("data-paideia-accent")).toBe(false);
    expect(embed.saveState().predictionCommitted).toBe(false);
  });
});
