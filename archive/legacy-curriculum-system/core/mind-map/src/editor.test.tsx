// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { MindMapEditor } from "./editor.js";
import type { MindMapNode } from "./types.js";

afterEach(() => {
  cleanup();
});

describe("<MindMapEditor>", () => {
  it("generates child ids that are unique across the whole tree", () => {
    const initial: MindMapNode = {
      id: "root",
      label: "Root",
      children: [
        { id: "topic", label: "Topic" },
        {
          id: "other",
          label: "Other",
          children: [{ id: "topic-child-1", label: "Existing collision" }],
        },
      ],
    };
    let changed: MindMapNode | undefined;

    render(<MindMapEditor initial={initial} onChange={(root) => { changed = root; }} />);
    fireEvent.change(screen.getByLabelText("Node"), { target: { value: "topic" } });
    fireEvent.click(screen.getByText("Add child"));

    const topic = changed?.children?.find((node) => node.id === "topic");
    expect(topic?.children?.[0]?.id).toBe("topic-child-2");
  });
});
