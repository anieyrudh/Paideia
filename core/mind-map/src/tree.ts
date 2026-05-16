import { err, ok, type KernelResult } from "@paideia/shared";
import type { MindMapNode } from "./types.js";

export const validateMindMap = (root: MindMapNode): KernelResult<void> => {
  const ids = new Set<string>();
  const activeObjects = new WeakSet<object>();

  const visit = (node: MindMapNode): KernelResult<void> => {
    if (activeObjects.has(node)) {
      return err("precondition-violated", `Mind-map contains a cycle at node id: ${node.id}`);
    }

    if (node.id.trim() === "") {
      return err("precondition-violated", "Mind-map node ids must be non-empty");
    }

    if (node.label.trim() === "") {
      return err("precondition-violated", `Mind-map node label must be non-empty: ${node.id}`);
    }

    if (ids.has(node.id)) {
      return err("precondition-violated", `Duplicate mind-map node id: ${node.id}`);
    }

    ids.add(node.id);
    activeObjects.add(node);

    for (const child of node.children ?? []) {
      const childResult = visit(child);
      if (!childResult.ok) return childResult;
    }

    activeObjects.delete(node);
    return ok(undefined);
  };

  return visit(root);
};

export const cloneNode = (node: MindMapNode): MindMapNode => ({
  id: node.id,
  label: node.label,
  ...(node.note !== undefined && { note: node.note }),
  ...(node.collapsed !== undefined && { collapsed: node.collapsed }),
  ...((node.children ?? []).length > 0 && {
    children: (node.children ?? []).map((child) => cloneNode(child)),
  }),
});

export const mapNode = (
  node: MindMapNode,
  id: string,
  update: (node: MindMapNode) => MindMapNode,
): MindMapNode =>
  node.id === id
    ? update(node)
    : {
        ...node,
        ...((node.children ?? []).length > 0 && {
          children: (node.children ?? []).map((child) => mapNode(child, id, update)),
        }),
      };

export const removeNode = (node: MindMapNode, id: string): MindMapNode => ({
  ...node,
  children: (node.children ?? [])
    .filter((child) => child.id !== id)
    .map((child) => removeNode(child, id)),
});

export const containsId = (node: MindMapNode, id: string): boolean =>
  node.id === id || (node.children ?? []).some((child) => containsId(child, id));

export const findNode = (node: MindMapNode, id: string): MindMapNode | null => {
  if (node.id === id) return node;
  for (const child of node.children ?? []) {
    const found = findNode(child, id);
    if (found !== null) return found;
  }
  return null;
};
