import { describe, expect, it } from "vitest";
import {
  parseMarkmap,
  parseMermaidMindmap,
  serializeMarkmap,
  type MindMapNode,
} from "./index.js";

describe("@paideia/mind-map", () => {
  it("parses markmap-flavoured indented markdown into the declared tree", () => {
    const result = parseMarkmap(`
- Photosynthesis {#root}
  - Light reactions {#light}
  - Calvin cycle {#calvin}
    - Carbon fixation {#fixation}
`);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual({
        id: "root",
        label: "Photosynthesis",
        children: [
          { id: "light", label: "Light reactions" },
          {
            id: "calvin",
            label: "Calvin cycle",
            children: [{ id: "fixation", label: "Carbon fixation" }],
          },
        ],
      });
    }
  });

  it("rejects duplicate ids instead of auto-renaming silently", () => {
    const result = parseMarkmap(`
- Root {#root}
  - First {#dup}
  - Second {#dup}
`);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("precondition-violated");
  });

  it("parses a heading root followed by an unindented list child", () => {
    const result = parseMarkmap(`
# Root {#root}
- Child {#child}
`);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual({
        id: "root",
        label: "Root",
        children: [{ id: "child", label: "Child" }],
      });
    }
  });

  it("parses Mermaid mindmap syntax without a Mermaid runtime", () => {
    const result = parseMermaidMindmap(`
mindmap
  root((Energy))
    Kinetic
    Potential
`);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.label).toBe("Energy");
      expect(result.value.children?.map((node) => node.label)).toEqual(["Kinetic", "Potential"]);
    }
  });

  it("serializes stable markdown that round-trips ids, notes, and collapsed state", () => {
    const root: MindMapNode = {
      id: "root",
      label: "Root",
      note: "Central idea",
      children: [{ id: "child", label: "Child", collapsed: true }],
    };
    const reparsed = parseMarkmap(serializeMarkmap(root));
    expect(reparsed.ok).toBe(true);
    if (reparsed.ok) expect(reparsed.value).toEqual(root);
  });

  it("throws instead of erasing invalid trees during serialization", () => {
    const root: MindMapNode = {
      id: "root",
      label: "Root",
      children: [{ id: "root", label: "Duplicate" }],
    };
    expect(() => serializeMarkmap(root)).toThrow(RangeError);
  });
});
