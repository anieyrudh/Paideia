import { err, ok, type KernelResult } from "@paideia/shared";
import type { Graph } from "./types.js";

export const validateGraph = (graph: Graph): KernelResult<ReadonlyMap<string, number>> => {
  const ids = new Map<string, number>();

  for (const [index, node] of graph.nodes.entries()) {
    if (node.id.trim() === "") {
      return err("precondition-violated", "Graph node ids must be non-empty strings");
    }
    if (ids.has(node.id)) {
      return err("precondition-violated", `Duplicate graph node id: ${node.id}`);
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
  }

  return ok(ids);
};

export const adjacency = (graph: Graph): ReadonlyMap<string, readonly string[]> => {
  const next = new Map<string, string[]>();
  for (const node of graph.nodes) next.set(node.id, []);
  for (const link of graph.links) {
    next.get(link.source)?.push(link.target);
  }
  return next;
};
