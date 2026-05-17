import { err, ok, type KernelResult } from "@paideia/shared";

export interface GraphNode {
  readonly id: string;
}

export interface WeightedEdge {
  readonly source: string;
  readonly target: string;
  readonly weight?: number;
}

export interface WeightedGraph {
  readonly directed?: boolean;
  readonly nodes: readonly GraphNode[];
  readonly edges: readonly WeightedEdge[];
}

export interface Neighbor {
  readonly id: string;
  readonly weight: number;
}

export interface NodeDistance {
  readonly id: string;
  readonly distance: number;
}

export interface NodePredecessor {
  readonly id: string;
  readonly predecessor: string | null;
}

export interface TraversalResult {
  readonly order: readonly string[];
  readonly distances: readonly NodeDistance[];
  readonly predecessors: readonly NodePredecessor[];
}

export interface DepthFirstResult {
  readonly preorder: readonly string[];
  readonly postorder: readonly string[];
  readonly hasCycle: boolean;
}

export interface ShortestPathResult {
  readonly path: readonly string[];
  readonly distance: number;
  readonly distances: readonly NodeDistance[];
  readonly predecessors: readonly NodePredecessor[];
}

export interface TopologicalSortResult {
  readonly order: readonly string[];
}

export interface ConnectedComponentsResult {
  readonly components: readonly (readonly string[])[];
}

export interface MinimumSpanningTreeResult {
  readonly edges: readonly Required<WeightedEdge>[];
  readonly totalWeight: number;
}

interface ValidGraph {
  readonly directed: boolean;
  readonly ids: readonly string[];
  readonly idSet: ReadonlySet<string>;
  readonly edges: readonly Required<WeightedEdge>[];
}

const weightOf = (edge: WeightedEdge): number => edge.weight ?? 1;

const validateGraph = (
  graph: WeightedGraph,
  opts: { readonly requireNonNegativeWeights?: boolean } = {},
): KernelResult<ValidGraph> => {
  const ids: string[] = [];
  const idSet = new Set<string>();

  for (const node of graph.nodes) {
    if (node.id.length === 0) {
      return err("precondition-violated", "Node ids must be non-empty strings");
    }
    if (idSet.has(node.id)) {
      return err("precondition-violated", `Duplicate node id: ${node.id}`);
    }
    ids.push(node.id);
    idSet.add(node.id);
  }

  const edges: Required<WeightedEdge>[] = [];
  for (const edge of graph.edges) {
    if (!idSet.has(edge.source) || !idSet.has(edge.target)) {
      return err(
        "precondition-violated",
        `Edge ${edge.source} -> ${edge.target} references a missing node`,
      );
    }

    const weight = weightOf(edge);
    if (!Number.isFinite(weight)) {
      return err(
        "precondition-violated",
        `Edge ${edge.source} -> ${edge.target} has a non-finite weight`,
      );
    }
    if (opts.requireNonNegativeWeights === true && weight < 0) {
      return err(
        "precondition-violated",
        `Edge ${edge.source} -> ${edge.target} has a negative weight`,
      );
    }

    edges.push({ source: edge.source, target: edge.target, weight });
  }

  return ok({ directed: graph.directed === true, ids, idSet, edges });
};

const requireNode = (graph: ValidGraph, nodeId: string): KernelResult<null> =>
  graph.idSet.has(nodeId)
    ? ok(null)
    : err("precondition-violated", `Unknown node id: ${nodeId}`);

const adjacencyOf = (graph: ValidGraph): ReadonlyMap<string, readonly Neighbor[]> => {
  const adjacency = new Map<string, Neighbor[]>();
  for (const id of graph.ids) adjacency.set(id, []);

  for (const edge of graph.edges) {
    const sourceNeighbors = adjacency.get(edge.source);
    if (sourceNeighbors !== undefined) {
      sourceNeighbors.push({ id: edge.target, weight: edge.weight });
    }

    if (!graph.directed) {
      const targetNeighbors = adjacency.get(edge.target);
      if (targetNeighbors !== undefined) {
        targetNeighbors.push({ id: edge.source, weight: edge.weight });
      }
    }
  }

  return adjacency;
};

const finiteOrInfinityDistances = (
  ids: readonly string[],
  distances: ReadonlyMap<string, number>,
): readonly NodeDistance[] =>
  ids.map((id) => ({ id, distance: distances.get(id) ?? Number.POSITIVE_INFINITY }));

const predecessorList = (
  ids: readonly string[],
  predecessors: ReadonlyMap<string, string>,
): readonly NodePredecessor[] =>
  ids.map((id) => ({ id, predecessor: predecessors.get(id) ?? null }));

export const neighbors = (
  graph: WeightedGraph,
  nodeId: string,
): KernelResult<readonly Neighbor[]> => {
  const valid = validateGraph(graph);
  if (!valid.ok) return valid;

  const knownNode = requireNode(valid.value, nodeId);
  if (!knownNode.ok) return knownNode;

  return ok([...(adjacencyOf(valid.value).get(nodeId) ?? [])]);
};

export const breadthFirstSearch = (
  graph: WeightedGraph,
  start: string,
): KernelResult<TraversalResult> => {
  const valid = validateGraph(graph);
  if (!valid.ok) return valid;

  const knownStart = requireNode(valid.value, start);
  if (!knownStart.ok) return knownStart;

  const adjacency = adjacencyOf(valid.value);
  const queue: string[] = [start];
  const visited = new Set<string>([start]);
  const distances = new Map<string, number>([[start, 0]]);
  const predecessors = new Map<string, string>();
  const order: string[] = [];

  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const current = queue[cursor];
    if (current === undefined) {
      return err("precondition-violated", "Traversal queue became inconsistent");
    }
    order.push(current);
    const currentDistance = distances.get(current);
    if (currentDistance === undefined) {
      return err("precondition-violated", `Missing distance for ${current}`);
    }

    for (const neighbor of adjacency.get(current) ?? []) {
      if (!visited.has(neighbor.id)) {
        visited.add(neighbor.id);
        distances.set(neighbor.id, currentDistance + 1);
        predecessors.set(neighbor.id, current);
        queue.push(neighbor.id);
      }
    }
  }

  return ok({
    order,
    distances: finiteOrInfinityDistances(valid.value.ids, distances),
    predecessors: predecessorList(valid.value.ids, predecessors),
  });
};

export const depthFirstSearch = (
  graph: WeightedGraph,
  start: string,
): KernelResult<DepthFirstResult> => {
  const valid = validateGraph(graph);
  if (!valid.ok) return valid;

  const knownStart = requireNode(valid.value, start);
  if (!knownStart.ok) return knownStart;

  const adjacency = adjacencyOf(valid.value);
  const state = new Map<string, "visiting" | "visited">();
  const preorder: string[] = [];
  const postorder: string[] = [];
  let hasCycle = false;

  const visit = (id: string, parent: string | null): void => {
    state.set(id, "visiting");
    preorder.push(id);

    for (const neighbor of adjacency.get(id) ?? []) {
      const neighborState = state.get(neighbor.id);
      if (neighborState === undefined) {
        visit(neighbor.id, id);
      } else if (neighborState === "visiting") {
        if (valid.value.directed || neighbor.id !== parent) {
          hasCycle = true;
        }
      }
    }

    state.set(id, "visited");
    postorder.push(id);
  };

  visit(start, null);

  return ok({ preorder, postorder, hasCycle });
};

const unvisitedNodeWithSmallestDistance = (
  ids: readonly string[],
  unvisited: ReadonlySet<string>,
  distances: ReadonlyMap<string, number>,
): string | null => {
  let best: string | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const id of ids) {
    if (!unvisited.has(id)) continue;
    const distance = distances.get(id) ?? Number.POSITIVE_INFINITY;
    if (distance < bestDistance) {
      best = id;
      bestDistance = distance;
    }
  }

  return best;
};

const reconstructPath = (
  predecessors: ReadonlyMap<string, string>,
  start: string,
  target: string,
): readonly string[] => {
  const reversed: string[] = [];
  let current: string | null = target;

  while (current !== null) {
    reversed.push(current);
    if (current === start) break;
    current = predecessors.get(current) ?? null;
  }

  return reversed.at(-1) === start ? reversed.reverse() : [];
};

export const dijkstraShortestPath = (
  graph: WeightedGraph,
  start: string,
  target: string,
): KernelResult<ShortestPathResult> => {
  const valid = validateGraph(graph, { requireNonNegativeWeights: true });
  if (!valid.ok) return valid;

  const knownStart = requireNode(valid.value, start);
  if (!knownStart.ok) return knownStart;
  const knownTarget = requireNode(valid.value, target);
  if (!knownTarget.ok) return knownTarget;

  const adjacency = adjacencyOf(valid.value);
  const unvisited = new Set(valid.value.ids);
  const distances = new Map<string, number>([[start, 0]]);
  const predecessors = new Map<string, string>();

  while (unvisited.size > 0) {
    const current = unvisitedNodeWithSmallestDistance(valid.value.ids, unvisited, distances);
    if (current === null) break;
    unvisited.delete(current);
    if (current === target) break;

    const currentDistance = distances.get(current) ?? Number.POSITIVE_INFINITY;
    for (const neighbor of adjacency.get(current) ?? []) {
      if (!unvisited.has(neighbor.id)) continue;
      const candidate = currentDistance + neighbor.weight;
      const existing = distances.get(neighbor.id) ?? Number.POSITIVE_INFINITY;
      if (candidate < existing) {
        distances.set(neighbor.id, candidate);
        predecessors.set(neighbor.id, current);
      }
    }
  }

  const distance = distances.get(target) ?? Number.POSITIVE_INFINITY;
  return ok({
    path: Number.isFinite(distance) ? reconstructPath(predecessors, start, target) : [],
    distance,
    distances: finiteOrInfinityDistances(valid.value.ids, distances),
    predecessors: predecessorList(valid.value.ids, predecessors),
  });
};

export const topologicalSort = (
  graph: WeightedGraph,
): KernelResult<TopologicalSortResult> => {
  const valid = validateGraph(graph);
  if (!valid.ok) return valid;
  if (!valid.value.directed) {
    return err("precondition-violated", "Topological sort requires a directed graph");
  }

  const indegree = new Map<string, number>();
  for (const id of valid.value.ids) indegree.set(id, 0);
  for (const edge of valid.value.edges) {
    indegree.set(edge.target, (indegree.get(edge.target) ?? 0) + 1);
  }

  const ready = valid.value.ids.filter((id) => (indegree.get(id) ?? 0) === 0);
  const order: string[] = [];
  const adjacency = adjacencyOf(valid.value);

  for (let cursor = 0; cursor < ready.length; cursor += 1) {
    const current = ready[cursor];
    if (current === undefined) {
      return err("precondition-violated", "Topological queue became inconsistent");
    }
    order.push(current);

    for (const neighbor of adjacency.get(current) ?? []) {
      const nextIndegree = (indegree.get(neighbor.id) ?? 0) - 1;
      indegree.set(neighbor.id, nextIndegree);
      if (nextIndegree === 0) ready.push(neighbor.id);
    }
  }

  if (order.length !== valid.value.ids.length) {
    return err("precondition-violated", "Topological sort requires an acyclic graph");
  }

  return ok({ order });
};

export const connectedComponents = (
  graph: WeightedGraph,
): KernelResult<ConnectedComponentsResult> => {
  const valid = validateGraph(graph);
  if (!valid.ok) return valid;

  const undirectedGraph: ValidGraph = {
    ...valid.value,
    directed: false,
  };
  const adjacency = adjacencyOf(undirectedGraph);
  const visited = new Set<string>();
  const components: (readonly string[])[] = [];

  for (const id of valid.value.ids) {
    if (visited.has(id)) continue;

    const component: string[] = [];
    const queue: string[] = [id];
    visited.add(id);

    for (let cursor = 0; cursor < queue.length; cursor += 1) {
      const current = queue[cursor];
      if (current === undefined) {
        return err("precondition-violated", "Component queue became inconsistent");
      }
      component.push(current);

      for (const neighbor of adjacency.get(current) ?? []) {
        if (!visited.has(neighbor.id)) {
          visited.add(neighbor.id);
          queue.push(neighbor.id);
        }
      }
    }

    components.push(component);
  }

  return ok({ components });
};

interface DisjointSet {
  readonly parent: Map<string, string>;
  readonly rank: Map<string, number>;
}

const findRoot = (set: DisjointSet, id: string): string => {
  const parent = set.parent.get(id);
  if (parent === undefined || parent === id) return id;
  const root = findRoot(set, parent);
  set.parent.set(id, root);
  return root;
};

const union = (set: DisjointSet, a: string, b: string): boolean => {
  const rootA = findRoot(set, a);
  const rootB = findRoot(set, b);
  if (rootA === rootB) return false;

  const rankA = set.rank.get(rootA) ?? 0;
  const rankB = set.rank.get(rootB) ?? 0;
  if (rankA < rankB) {
    set.parent.set(rootA, rootB);
  } else if (rankA > rankB) {
    set.parent.set(rootB, rootA);
  } else {
    set.parent.set(rootB, rootA);
    set.rank.set(rootA, rankA + 1);
  }

  return true;
};

export const minimumSpanningTree = (
  graph: WeightedGraph,
): KernelResult<MinimumSpanningTreeResult> => {
  const valid = validateGraph(graph, { requireNonNegativeWeights: true });
  if (!valid.ok) return valid;
  if (valid.value.directed) {
    return err("precondition-violated", "Minimum spanning tree requires an undirected graph");
  }

  const set: DisjointSet = {
    parent: new Map(valid.value.ids.map((id) => [id, id])),
    rank: new Map(valid.value.ids.map((id) => [id, 0])),
  };
  const edgeBuckets = new Map<number, Array<{ readonly edge: Required<WeightedEdge>; readonly index: number }>>();
  valid.value.edges.forEach((edge, index) => {
    const bucket = edgeBuckets.get(edge.weight) ?? [];
    bucket.push({ edge, index });
    edgeBuckets.set(edge.weight, bucket);
  });
  const sortedWeights = [...edgeBuckets.keys()].sort((a, b) => a - b);

  const edges: Required<WeightedEdge>[] = [];
  let totalWeight = 0;
  for (const weight of sortedWeights) {
    const bucket = edgeBuckets.get(weight) ?? [];
    for (const { edge } of bucket) {
      if (union(set, edge.source, edge.target)) {
        edges.push(edge);
        totalWeight += edge.weight;
      }
    }
  }

  const expectedEdges = Math.max(0, valid.value.ids.length - 1);
  if (valid.value.ids.length > 0 && edges.length !== expectedEdges) {
    return err("precondition-violated", "Minimum spanning tree requires a connected graph");
  }

  return ok({ edges, totalWeight });
};
