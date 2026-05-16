import { err, ok, type KernelResult } from "@paideia/shared";
import type { Graph, TreeNode } from "./types.js";

export const validateGraph = (graph: Graph): KernelResult<ReadonlyMap<string, number>> => {
  const ids = new Map<string, number>();

  graph.nodes.forEach((node, index) => {
    if (node.id.trim() === "") {
      ids.set("", index);
    }
  });

  for (const [index, node] of graph.nodes.entries()) {
    if (node.id.trim() === "") {
      return err("precondition-violated", "Graph node ids must be non-empty strings");
    }

    if (ids.has(node.id)) {
      return err("precondition-violated", `Duplicate graph node id: ${node.id}`);
    }

    if (node.weight !== undefined && (!Number.isFinite(node.weight) || node.weight <= 0)) {
      return err("precondition-violated", `Graph node weight must be positive: ${node.id}`);
    }

    ids.set(node.id, index);
  }

  for (const link of graph.links) {
    if (!ids.has(link.source)) {
      return err("precondition-violated", `Graph link source does not exist: ${link.source}`);
    }

    if (!ids.has(link.target)) {
      return err("precondition-violated", `Graph link target does not exist: ${link.target}`);
    }

    if (
      link.strength !== undefined &&
      (!Number.isFinite(link.strength) || link.strength <= 0)
    ) {
      return err(
        "precondition-violated",
        `Graph link strength must be positive: ${link.source} -> ${link.target}`,
      );
    }
  }

  return ok(ids);
};

export const validateTree = (root: TreeNode): KernelResult<void> => {
  const ids = new Set<string>();
  const activeObjects = new WeakSet<object>();

  const visit = (node: TreeNode): KernelResult<void> => {
    if (activeObjects.has(node)) {
      return err("precondition-violated", `Tree contains a cycle at node id: ${node.id}`);
    }

    if (node.id.trim() === "") {
      return err("precondition-violated", "Tree node ids must be non-empty strings");
    }

    if (ids.has(node.id)) {
      return err("precondition-violated", `Duplicate tree node id: ${node.id}`);
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
