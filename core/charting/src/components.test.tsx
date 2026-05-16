import { isValidElement, type ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { LineChart, Sankey } from "./components.js";

const collectElements = (node: ReactNode, type: string): ReactNode[] => {
  if (Array.isArray(node)) return node.flatMap((child) => collectElements(child, type));
  if (!isValidElement(node)) return [];
  const children = "children" in node.props ? (node.props.children as ReactNode) : undefined;
  return [
    ...(node.type === type ? [node] : []),
    ...collectElements(children, type),
  ];
};

describe("chart renderers", () => {
  it("starts a new line segment after log-scale rejected points", () => {
    const chart = LineChart({
      data: [
        { x: 1, y: 1 },
        { x: 2, y: 0 },
        { x: 3, y: 3 },
      ],
      y: { scale: "log" },
    });
    const paths = collectElements(chart, "path");
    expect(paths).toHaveLength(2);
    for (const path of paths) {
      if (isValidElement(path)) expect(String(path.props.d).startsWith("M ")).toBe(true);
    }
  });

  it("does not render negative Sankey values as positive-width flows", () => {
    const chart = Sankey({
      nodes: [{ id: "a", label: "A" }, { id: "b", label: "B" }],
      links: [{ source: "a", target: "b", value: -1 }],
    });
    const paths = collectElements(chart, "path");
    expect(paths).toHaveLength(0);
    expect(collectElements(chart, "text")).toHaveLength(1);
  });

  it("renders zero Sankey values with zero width but keeps tiny positives visible", () => {
    const chart = Sankey({
      nodes: [{ id: "a", label: "A" }, { id: "b", label: "B" }],
      links: [
        { source: "a", target: "b", value: 0 },
        { source: "a", target: "b", value: 0.001 },
      ],
    });

    const paths = collectElements(chart, "path");
    expect(paths).toHaveLength(2);
    const widths = paths.flatMap((path) => isValidElement(path) ? [path.props.strokeWidth] : []);
    expect(widths).toEqual([0, 1]);
  });

  it("uses unique keys for parallel Sankey links", () => {
    const chart = Sankey({
      nodes: [{ id: "a", label: "A" }, { id: "b", label: "B" }],
      links: [
        { source: "a", target: "b", value: 1 },
        { source: "a", target: "b", value: 2 },
      ],
    });

    const keys = collectElements(chart, "path").flatMap((path) =>
      isValidElement(path) && path.key !== null ? [path.key] : [],
    );
    expect(new Set(keys).size).toBe(keys.length);
  });
});
