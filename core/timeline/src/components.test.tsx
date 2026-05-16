import type { ReactElement } from "react";
import { describe, expect, it } from "vitest";
import { Timeline } from "./components.js";

interface ElementLike {
  readonly type: unknown;
  readonly props: Readonly<Record<string, unknown>>;
}

const isElementLike = (value: unknown): value is ElementLike => {
  if (typeof value !== "object" || value === null) return false;
  const props = (value as Readonly<Record<string, unknown>>).props;
  return typeof props === "object" && props !== null;
};

const collectGroups = (value: unknown): readonly ElementLike[] => {
  if (Array.isArray(value)) return value.flatMap((item) => collectGroups(item));
  if (!isElementLike(value)) return [];
  const nested = collectGroups(value.props.children);
  return value.type === "g" ? [value, ...nested] : nested;
};

describe("<Timeline>", () => {
  it("makes selectable SVG groups keyboard accessible", () => {
    const selected: string[] = [];
    const element = Timeline({
      events: [{ id: "a", at: 0, label: "Alpha" }],
      onSelect: (id) => selected.push(id),
    }) as ReactElement;
    const group = collectGroups(element)[0];

    expect(group?.props.role).toBe("button");
    expect(group?.props.tabIndex).toBe(0);
    expect(group?.props["aria-label"]).toBe("Alpha");
    expect(typeof group?.props.onKeyDown).toBe("function");

    const onKeyDown = group?.props.onKeyDown as
      | ((event: { readonly key: string; preventDefault: () => void }) => void)
      | undefined;
    let prevented = false;
    onKeyDown?.({ key: "Enter", preventDefault: () => { prevented = true; } });
    onKeyDown?.({ key: " ", preventDefault: () => { prevented = true; } });

    expect(prevented).toBe(true);
    expect(selected).toEqual(["a", "a"]);
  });
});
