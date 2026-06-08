import { err, ok, type Brand, type KernelResult } from "@paideia/shared";

export type ArgumentNodeId = Brand<string, "ArgumentGraph.NodeId">;
export type ArgumentRelationId = Brand<string, "ArgumentGraph.RelationId">;

export type ArgumentNodeKind =
  | "claim"
  | "evidence"
  | "warrant"
  | "rebuttal"
  | "question";

export type ArgumentRelationKind =
  | "supports"
  | "attacks"
  | "qualifies"
  | "depends-on";

export interface ArgumentNode {
  readonly id: ArgumentNodeId;
  readonly kind: ArgumentNodeKind;
  readonly label: string;
  readonly sourceId?: string;
}

export interface ArgumentRelation {
  readonly id: ArgumentRelationId;
  readonly kind: ArgumentRelationKind;
  readonly from: ArgumentNodeId;
  readonly to: ArgumentNodeId;
  readonly weight?: number;
}

export interface ArgumentGraph {
  readonly nodes: readonly ArgumentNode[];
  readonly relations: readonly ArgumentRelation[];
}

export interface ArgumentAdjacency {
  readonly nodeId: ArgumentNodeId;
  readonly incoming: readonly ArgumentRelation[];
  readonly outgoing: readonly ArgumentRelation[];
}

export interface ArgumentCycle {
  readonly nodeIds: readonly ArgumentNodeId[];
  readonly relationIds: readonly ArgumentRelationId[];
}

export interface ArgumentBalance {
  readonly nodeId: ArgumentNodeId;
  readonly supports: number;
  readonly attacks: number;
  readonly qualifies: number;
  readonly dependsOn: number;
  readonly netSupport: number;
}

export interface ArgumentNeighborhood {
  readonly center: ArgumentNode;
  readonly nodes: readonly ArgumentNode[];
  readonly relations: readonly ArgumentRelation[];
}

const reservedIds = new Set(["__proto__", "prototype", "constructor"]);
const nodeKinds = new Set<ArgumentNodeKind>(["claim", "evidence", "warrant", "rebuttal", "question"]);
const relationKinds = new Set<ArgumentRelationKind>(["supports", "attacks", "qualifies", "depends-on"]);

export const argumentNodeId = (value: string): KernelResult<ArgumentNodeId> =>
  brandArgumentNodeId(value);

export const argumentRelationId = (value: string): KernelResult<ArgumentRelationId> =>
  brandArgumentRelationId(value);

export const validateArgumentGraph = (
  graph: ArgumentGraph,
): KernelResult<ArgumentGraph> => {
  const nodeIds = new Set<string>();
  const relationIds = new Set<string>();

  for (const node of graph.nodes) {
    const valid = validateNode(node);
    if (!valid.ok) return valid;
    if (nodeIds.has(node.id)) {
      return err("precondition-violated", `Duplicate argument node id: ${node.id}`);
    }
    nodeIds.add(node.id);
  }

  for (const relation of graph.relations) {
    const valid = validateRelation(relation, nodeIds);
    if (!valid.ok) return valid;
    if (relationIds.has(relation.id)) {
      return err("precondition-violated", `Duplicate argument relation id: ${relation.id}`);
    }
    relationIds.add(relation.id);
  }

  return ok(graph);
};

export const adjacencyFor = (
  graph: ArgumentGraph,
  nodeId: ArgumentNodeId,
): KernelResult<ArgumentAdjacency> => {
  const valid = validateArgumentGraph(graph);
  if (!valid.ok) return valid;
  if (!hasNode(graph, nodeId)) {
    return err("precondition-violated", `Unknown argument node id: ${nodeId}`);
  }

  return ok({
    nodeId,
    incoming: graph.relations.filter((relation) => relation.to === nodeId),
    outgoing: graph.relations.filter((relation) => relation.from === nodeId),
  });
};

export const detectCycles = (
  graph: ArgumentGraph,
): KernelResult<readonly ArgumentCycle[]> => {
  const valid = validateArgumentGraph(graph);
  if (!valid.ok) return valid;

  const nodesById = new Map(graph.nodes.map((node) => [node.id, node]));
  const outgoingById = outgoingRelations(graph);
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const cycles: ArgumentCycle[] = [];

  const visit = (
    nodeId: ArgumentNodeId,
    pathNodes: readonly ArgumentNodeId[],
    pathRelations: readonly ArgumentRelationId[],
  ): void => {
    if (visiting.has(nodeId)) {
      const start = pathNodes.indexOf(nodeId);
      if (start >= 0) {
        cycles.push({
          nodeIds: pathNodes.slice(start),
          relationIds: pathRelations.slice(start),
        });
      }
      return;
    }
    if (visited.has(nodeId)) return;

    visiting.add(nodeId);
    for (const relation of outgoingById.get(nodeId) ?? []) {
      if (nodesById.has(relation.to)) {
        visit(relation.to, [...pathNodes, relation.to], [...pathRelations, relation.id]);
      }
    }
    visiting.delete(nodeId);
    visited.add(nodeId);
  };

  for (const node of graph.nodes) {
    visit(node.id, [node.id], []);
  }

  return ok(dedupeCycles(cycles));
};

export const topologicalArgumentOrder = (
  graph: ArgumentGraph,
): KernelResult<readonly ArgumentNodeId[]> => {
  const valid = validateArgumentGraph(graph);
  if (!valid.ok) return valid;
  const cycles = detectCycles(graph);
  if (!cycles.ok) return cycles;
  if (cycles.value.length > 0) {
    return err("precondition-violated", "Cannot topologically order an argument graph with cycles");
  }

  const indegree = new Map<ArgumentNodeId, number>();
  const outgoingById = outgoingRelations(graph);
  for (const node of graph.nodes) {
    indegree.set(node.id, 0);
  }
  for (const relation of graph.relations) {
    indegree.set(relation.to, (indegree.get(relation.to) ?? 0) + 1);
  }

  let ready = graph.nodes.filter((node) => indegree.get(node.id) === 0).map((node) => node.id);
  const ordered: ArgumentNodeId[] = [];

  while (ready.length > 0) {
    const nodeId = ready[0];
    if (nodeId === undefined) {
      return err("precondition-violated", "Internal topological queue became sparse");
    }
    ready = ready.slice(1);
    ordered.push(nodeId);
    for (const relation of outgoingById.get(nodeId) ?? []) {
      const next = (indegree.get(relation.to) ?? 0) - 1;
      indegree.set(relation.to, next);
      if (next === 0) {
        ready = insertByNodeOrder(ready, relation.to, graph);
      }
    }
  }

  return ordered.length === graph.nodes.length
    ? ok(ordered)
    : err("precondition-violated", "Cannot topologically order an argument graph with cycles");
};

export const argumentBalance = (
  graph: ArgumentGraph,
  nodeId: ArgumentNodeId,
): KernelResult<ArgumentBalance> => {
  const adjacency = adjacencyFor(graph, nodeId);
  if (!adjacency.ok) return adjacency;

  let supports = 0;
  let attacks = 0;
  let qualifies = 0;
  let dependsOn = 0;

  for (const relation of adjacency.value.incoming) {
    const weight = relation.weight ?? 1;
    if (relation.kind === "supports") supports += weight;
    if (relation.kind === "attacks") attacks += weight;
    if (relation.kind === "qualifies") qualifies += weight;
    if (relation.kind === "depends-on") dependsOn += weight;
  }

  return ok({
    nodeId,
    supports,
    attacks,
    qualifies,
    dependsOn,
    netSupport: supports - attacks,
  });
};

export const neighborhood = (
  graph: ArgumentGraph,
  nodeId: ArgumentNodeId,
  depth: number,
): KernelResult<ArgumentNeighborhood> => {
  const valid = validateArgumentGraph(graph);
  if (!valid.ok) return valid;
  if (!Number.isInteger(depth) || depth < 0) {
    return err("out-of-domain", "Neighborhood depth must be a non-negative integer");
  }

  const center = graph.nodes.find((node) => node.id === nodeId);
  if (center === undefined) {
    return err("precondition-violated", `Unknown argument node id: ${nodeId}`);
  }

  const nodeIds = new Set<string>([nodeId]);
  let frontier = new Set<string>([nodeId]);

  for (let step = 0; step < depth; step += 1) {
    const next = new Set<string>();
    for (const relation of graph.relations) {
      if (frontier.has(relation.from)) {
        next.add(relation.to);
      }
      if (frontier.has(relation.to)) {
        next.add(relation.from);
      }
    }
    for (const id of next) nodeIds.add(id);
    frontier = next;
  }

  const nodes = graph.nodes.filter((node) => nodeIds.has(node.id));
  const relations = graph.relations.filter(
    (relation) => nodeIds.has(relation.from) && nodeIds.has(relation.to),
  );

  return ok({ center, nodes, relations });
};

const validateId = (value: string, label: string): KernelResult<string> =>
  value.length > 0 && value.trim() === value && !/\s/.test(value) && !reservedIds.has(value)
    ? ok(value)
    : err(
      "precondition-violated",
      `${label} must be non-empty, trimmed, contain no whitespace, and avoid reserved object keys`,
    );

const brandArgumentNodeId = (value: string): KernelResult<ArgumentNodeId> => {
  const valid = validateId(value, "Argument node id");
  if (!valid.ok) return valid;
  return ok(valid.value as ArgumentNodeId);
};

const brandArgumentRelationId = (value: string): KernelResult<ArgumentRelationId> => {
  const valid = validateId(value, "Argument relation id");
  if (!valid.ok) return valid;
  return ok(valid.value as ArgumentRelationId);
};

const validateNode = (node: ArgumentNode): KernelResult<ArgumentNode> => {
  const id = argumentNodeId(node.id);
  if (!id.ok) return id;
  if (!nodeKinds.has(node.kind)) {
    return err("precondition-violated", `Argument node ${node.id} has invalid kind`);
  }
  if (!isTrimmedNonEmpty(node.label)) {
    return err("precondition-violated", "Argument node label must be non-empty and trimmed");
  }
  if (node.sourceId !== undefined && !isTrimmedNonEmpty(node.sourceId)) {
    return err("precondition-violated", "Argument node sourceId must be non-empty and trimmed");
  }
  return ok(node);
};

const validateRelation = (
  relation: ArgumentRelation,
  nodeIds: ReadonlySet<string>,
): KernelResult<ArgumentRelation> => {
  const id = argumentRelationId(relation.id);
  if (!id.ok) return id;
  if (!relationKinds.has(relation.kind)) {
    return err("precondition-violated", `Argument relation ${relation.id} has invalid kind`);
  }
  if (!nodeIds.has(relation.from)) {
    return err("precondition-violated", `Argument relation ${relation.id} has unknown from endpoint`);
  }
  if (!nodeIds.has(relation.to)) {
    return err("precondition-violated", `Argument relation ${relation.id} has unknown to endpoint`);
  }
  if (relation.from === relation.to) {
    return err("precondition-violated", `Argument relation ${relation.id} cannot point to itself`);
  }
  if (relation.weight !== undefined && (!Number.isFinite(relation.weight) || relation.weight < 0)) {
    return err("out-of-domain", `Argument relation ${relation.id} weight must be finite and non-negative`);
  }
  return ok(relation);
};

const hasNode = (graph: ArgumentGraph, nodeId: ArgumentNodeId): boolean =>
  graph.nodes.some((node) => node.id === nodeId);

const outgoingRelations = (
  graph: ArgumentGraph,
): ReadonlyMap<ArgumentNodeId, readonly ArgumentRelation[]> => {
  const grouped = new Map<ArgumentNodeId, ArgumentRelation[]>();
  for (const node of graph.nodes) {
    grouped.set(node.id, []);
  }
  for (const relation of graph.relations) {
    grouped.get(relation.from)?.push(relation);
  }
  return grouped;
};

const dedupeCycles = (cycles: readonly ArgumentCycle[]): readonly ArgumentCycle[] => {
  const seen = new Set<string>();
  const deduped: ArgumentCycle[] = [];

  for (const cycle of cycles) {
    const key = canonicalCycleKey(cycle.nodeIds);
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(cycle);
    }
  }

  return deduped;
};

const canonicalCycleKey = (ids: readonly ArgumentNodeId[]): string => {
  if (ids.length === 0) return "";
  const rotations = ids.map((_, index) => [
    ...ids.slice(index),
    ...ids.slice(0, index),
  ].join("\u0000"));
  return rotations.reduce((best, current) => current < best ? current : best);
};

const insertByNodeOrder = (
  ready: readonly ArgumentNodeId[],
  nodeId: ArgumentNodeId,
  graph: ArgumentGraph,
): ArgumentNodeId[] => {
  const nodeOrder = new Map(graph.nodes.map((node, index) => [node.id, index]));
  const nodeIndex = nodeOrder.get(nodeId);
  if (nodeIndex === undefined) return [...ready, nodeId];
  const inserted: ArgumentNodeId[] = [];
  let placed = false;
  for (const readyId of ready) {
    const readyIndex = nodeOrder.get(readyId) ?? Number.POSITIVE_INFINITY;
    if (!placed && nodeIndex < readyIndex) {
      inserted.push(nodeId);
      placed = true;
    }
    inserted.push(readyId);
  }
  if (!placed) inserted.push(nodeId);
  return inserted;
};

const isTrimmedNonEmpty = (value: string): boolean =>
  value.length > 0 && value.trim() === value;
