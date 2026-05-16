import { isValidElement, type KeyboardEvent, type ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { AnnotationLayer, canAddImageRegion } from "./components.js";

const collectElements = (node: ReactNode, type: string): ReactNode[] => {
  if (Array.isArray(node)) return node.flatMap((child) => collectElements(child, type));
  if (!isValidElement(node)) return [];
  const children = "children" in node.props ? (node.props.children as ReactNode) : undefined;
  return [
    ...(node.type === type ? [node] : []),
    ...collectElements(children, type),
  ];
};

describe("annotation components", () => {
  it("rejects zero-area image regions before adding", () => {
    expect(canAddImageRegion("claim", null)).toBe(false);
    expect(canAddImageRegion("claim", {
      x: { min: 0.25, max: 0.25 },
      y: { min: 0.1, max: 0.4 },
    })).toBe(false);
    expect(canAddImageRegion("claim", {
      x: { min: 0.25, max: 0.75 },
      y: { min: 0.1, max: 0.4 },
    })).toBe(true);
  });

  it("makes SVG image annotations keyboard-selectable", () => {
    const selected: string[] = [];
    const layer = AnnotationLayer({
      annotations: [
        {
          id: "a1",
          target: { kind: "image", rect: { x: { min: 0.2, max: 0.4 }, y: { min: 0.3, max: 0.5 } } },
          tag: "claim",
          createdAt: 1,
        },
      ],
      onSelect: (id) => selected.push(id),
    });

    const rect = collectElements(layer, "rect")[0];
    expect(isValidElement(rect)).toBe(true);
    if (!isValidElement(rect)) return;

    expect(rect.props.role).toBe("button");
    expect(rect.props.tabIndex).toBe(0);
    expect(rect.props["aria-label"]).toBe("Select claim annotation");

    let prevented = false;
    rect.props.onKeyDown?.({
      key: "Enter",
      preventDefault: () => {
        prevented = true;
      },
    } as KeyboardEvent<SVGRectElement>);

    expect(prevented).toBe(true);
    expect(selected).toEqual(["a1"]);
  });
});
