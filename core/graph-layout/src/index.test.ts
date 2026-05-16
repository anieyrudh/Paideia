import { isValidElement, type ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
import {
  ForceGraph2D,
  forceDirected2D,
  forceDirected3D,
  treeLayout,
  type Graph,
  type LayoutResult2D,
} from "./index.js";

interface ElementWithChildren {
  readonly children?: unknown;
}

interface NodeGroupProps {
  readonly onKeyDown?: (event: { readonly key: string; preventDefault: () => void }) => void;
  readonly role?: string;
  readonly tabIndex?: number;
}

const asElementArray = (children: unknown): readonly ReactElement[] =>
  Array.isArray(children) ? children.filter(isValidElement) : isValidElement(children) ? [children] : [];

const graph: Graph = {
  nodes: [{ id: "a" }, { id: "b", weight: 2 }, { id: "c" }],
  links: [
    { source: "a", target: "b" },
    { source: "b", target: "c", strength: 2 },
  ],
};

describe("@paideia/graph-layout", () => {
  it("returns deterministic 2D layouts for the same graph and seed", () => {
    const first = forceDirected2D(graph, { seed: 42, iterations: 20 });
    const second = forceDirected2D(graph, { seed: 42, iterations: 20 });
    expect(first).toEqual(second);
  });

  it("does not mutate the input graph", () => {
    const frozen: Graph = {
      nodes: Object.freeze(graph.nodes.map((node) => Object.freeze({ ...node }))),
      links: Object.freeze(graph.links.map((link) => Object.freeze({ ...link }))),
    };
    const before = JSON.stringify(frozen);
    expect(forceDirected3D(frozen, { seed: 7, iterations: 8 }).ok).toBe(true);
    expect(JSON.stringify(frozen)).toBe(before);
  });

  it("preserves duplicate links instead of deduping edge structure", () => {
    const withParallelLinks: Graph = {
      nodes: [{ id: "a" }, { id: "b" }],
      links: [
        { source: "a", target: "b" },
        { source: "a", target: "b" },
      ],
    };
    const result = forceDirected2D(withParallelLinks, { iterations: 0 });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.links).toHaveLength(2);
  });

  it("rejects links that reference missing nodes", () => {
    const result = forceDirected2D({
      nodes: [{ id: "a" }],
      links: [{ source: "a", target: "missing" }],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("precondition-violated");
  });

  it("lays trees out deterministically without swallowing children", () => {
    const result = treeLayout({
      id: "root",
      children: [
        { id: "left" },
        { id: "right", children: [{ id: "leaf" }] },
      ],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.nodes.map((node) => node.id)).toEqual([
        "root",
        "left",
        "right",
        "leaf",
      ]);
      expect(result.value.links).toEqual([
        { source: "root", target: "left" },
        { source: "root", target: "right" },
        { source: "right", target: "leaf" },
      ]);
    }
  });

  it("rejects unsupported tree orientations at runtime", () => {
    const result = treeLayout(
      { id: "root" },
      { orientation: "diagonal" as "vertical" },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("precondition-violated");
  });

  it("activates clickable SVG nodes with Enter and Space", () => {
    const clicked: string[] = [];
    const layout: LayoutResult2D = { nodes: [{ id: "a", x: 0, y: 0 }], links: [] };
    const element = ForceGraph2D({ layout, onNodeClick: (id) => clicked.push(id) });
    expect(isValidElement<ElementWithChildren>(element)).toBe(true);
    if (!isValidElement<ElementWithChildren>(element)) return;

    const svgChildren = asElementArray(element.props.children);
    const nodeLayer = svgChildren[1];
    expect(isValidElement<ElementWithChildren>(nodeLayer)).toBe(true);
    if (!isValidElement<ElementWithChildren>(nodeLayer)) return;

    const nodeGroup = asElementArray(nodeLayer.props.children)[0] as
      | ReactElement<NodeGroupProps>
      | undefined;
    expect(nodeGroup?.props.role).toBe("button");
    expect(nodeGroup?.props.tabIndex).toBe(0);

    const enterPreventDefault = vi.fn();
    nodeGroup?.props.onKeyDown?.({ key: "Enter", preventDefault: enterPreventDefault });
    expect(enterPreventDefault).toHaveBeenCalledOnce();

    const spacePreventDefault = vi.fn();
    nodeGroup?.props.onKeyDown?.({ key: " ", preventDefault: spacePreventDefault });
    expect(spacePreventDefault).toHaveBeenCalledOnce();

    const tabPreventDefault = vi.fn();
    nodeGroup?.props.onKeyDown?.({ key: "Tab", preventDefault: tabPreventDefault });
    expect(tabPreventDefault).not.toHaveBeenCalled();
    expect(clicked).toEqual(["a", "a"]);
  });
});
