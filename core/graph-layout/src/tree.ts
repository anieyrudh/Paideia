import { err, ok, type KernelResult } from "@paideia/shared";
import type { LayoutNode2D, LayoutResult2D, TreeLayoutOptions, TreeNode } from "./types.js";
import { validateTree } from "./validation.js";

interface PositionedSubtree {
  readonly id: string;
  readonly depth: number;
  readonly slot: number;
  readonly links: readonly { readonly source: string; readonly target: string }[];
  readonly descendants: readonly PositionedSubtree[];
}

const buildSlots = (
  node: TreeNode,
  depth: number,
  nextLeafSlot: { value: number },
): PositionedSubtree => {
  const children = node.children ?? [];
  if (children.length === 0) {
    const slot = nextLeafSlot.value;
    nextLeafSlot.value += 1;
    return { id: node.id, depth, slot, links: [], descendants: [] };
  }

  const descendants = children.map((child) => buildSlots(child, depth + 1, nextLeafSlot));
  const first = descendants[0];
  const last = descendants[descendants.length - 1];
  const slot =
    first === undefined || last === undefined
      ? nextLeafSlot.value
      : (first.slot + last.slot) / 2;
  const links = children.map((child) => ({ source: node.id, target: child.id }));
  return { id: node.id, depth, slot, links, descendants };
};

const flatten = (
  subtree: PositionedSubtree,
  nodes: LayoutNode2D[],
  links: { source: string; target: string }[],
  spacing: number,
  orientation: "vertical" | "horizontal",
): void => {
  const primary = subtree.slot * spacing;
  const secondary = subtree.depth * spacing;
  nodes.push(
    orientation === "vertical"
      ? { id: subtree.id, x: primary, y: secondary }
      : { id: subtree.id, x: secondary, y: primary },
  );
  links.push(...subtree.links);
  subtree.descendants.forEach((child) => flatten(child, nodes, links, spacing, orientation));
};

export const treeLayout = (
  root: TreeNode,
  opts: TreeLayoutOptions = {},
): KernelResult<LayoutResult2D> => {
  const valid = validateTree(root);
  if (!valid.ok) return valid;

  const spacing = opts.nodeSpacing ?? 80;
  if (!Number.isFinite(spacing) || spacing <= 0) {
    return err("precondition-violated", "nodeSpacing must be a positive finite number");
  }

  const orientation = opts.orientation ?? "vertical";
  const slots = buildSlots(root, 0, { value: 0 });
  const nodes: LayoutNode2D[] = [];
  const links: { source: string; target: string }[] = [];
  flatten(slots, nodes, links, spacing, orientation);

  if (nodes.length === 0) {
    return ok({ nodes: [], links: [] });
  }

  const minX = Math.min(...nodes.map((node) => node.x));
  const minY = Math.min(...nodes.map((node) => node.y));
  return ok({
    nodes: nodes.map((node) => ({ id: node.id, x: node.x - minX, y: node.y - minY })),
    links,
  });
};
