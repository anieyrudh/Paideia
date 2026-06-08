import { type Brand, err, ok, type KernelResult } from "@paideia/shared";

/**
 * @paideia/signal-pathway — Deterministic synchronous cascade propagation.
 *
 * A small directed acyclic graph of cascade nodes with activation/inhibition
 * edges. Owns the saturating-response activation function and the topological
 * propagation step. No time integration, no stochastic noise, no
 * molecular labels.
 */

export type SignalLevel = Brand<number, "SignalLevel_0_1">;
export type EdgeWeight = Brand<number, "EdgeWeight_0_1">;
export type NodeId = Brand<string, "NodeId">;
export type EdgeEffect = "activate" | "inhibit";

export interface CascadeNode {
  readonly id: NodeId;
  readonly basal: SignalLevel;
  readonly threshold: SignalLevel;
  readonly sensitivity: number;
}

export interface CascadeEdge {
  readonly from: NodeId;
  readonly to: NodeId;
  readonly effect: EdgeEffect;
  readonly weight: EdgeWeight;
}

export interface CascadeGraph {
  readonly nodes: ReadonlyArray<CascadeNode>;
  readonly edges: ReadonlyArray<CascadeEdge>;
}

export interface PropagationResult {
  readonly outputs: ReadonlyMap<NodeId, SignalLevel>;
  readonly order: ReadonlyArray<NodeId>;
}

// ──────────────────────────────────────────────────────────────────────────
// Constructors
// ──────────────────────────────────────────────────────────────────────────

const requireFinite = (
  value: number,
  label: string,
): KernelResult<number> =>
  typeof value === "number" && Number.isFinite(value)
    ? ok(value)
    : err(
        "precondition-violated",
        `${label} must be a finite number; got ${String(value)}.`,
      );

const requireUnitInterval = (
  value: number,
  label: string,
): KernelResult<number> => {
  const finite = requireFinite(value, label);
  if (!finite.ok) return finite;
  if (finite.value < 0 || finite.value > 1) {
    return err(
      "out-of-domain",
      `${label} must lie in [0, 1]; got ${finite.value}.`,
    );
  }
  return ok(finite.value);
};

export const signalLevel = (value: number): KernelResult<SignalLevel> => {
  const result = requireUnitInterval(value, "SignalLevel");
  return result.ok ? ok(result.value as SignalLevel) : result;
};

export const edgeWeight = (value: number): KernelResult<EdgeWeight> => {
  const result = requireUnitInterval(value, "EdgeWeight");
  return result.ok ? ok(result.value as EdgeWeight) : result;
};

export const nodeId = (value: string): KernelResult<NodeId> => {
  if (typeof value !== "string") {
    return err("precondition-violated", "NodeId must be a string.");
  }
  if (value.length === 0) {
    return err("precondition-violated", "NodeId must not be empty.");
  }
  return ok(value as NodeId);
};

export const sensitivity = (value: number): KernelResult<number> => {
  const finite = requireFinite(value, "sensitivity");
  if (!finite.ok) return finite;
  if (finite.value <= 0) {
    return err(
      "out-of-domain",
      `sensitivity must be strictly positive; got ${finite.value}.`,
    );
  }
  return ok(finite.value);
};

// ──────────────────────────────────────────────────────────────────────────
// Saturating response (logistic)
// ──────────────────────────────────────────────────────────────────────────

const clamp01 = (value: number): number =>
  value < 0 ? 0 : value > 1 ? 1 : value;

export const saturatingResponse = (
  effectiveInputValue: number,
  threshold: SignalLevel,
  sensitivityValue: number,
): KernelResult<SignalLevel> => {
  const x = requireFinite(effectiveInputValue, "effectiveInput");
  if (!x.ok) return x;
  const t = requireUnitInterval(threshold as unknown as number, "threshold");
  if (!t.ok) return t;
  const k = sensitivity(sensitivityValue);
  if (!k.ok) return k;
  const z = -k.value * (x.value - t.value);
  // Numerically stable logistic: avoid Math.exp(huge) blowing to Infinity.
  let response: number;
  if (z >= 0) {
    const e = Math.exp(-z);
    response = e / (1 + e);
  } else {
    response = 1 / (1 + Math.exp(z));
  }
  if (!Number.isFinite(response)) {
    return err(
      "numerical-instability",
      `Saturating response produced a non-finite value (${String(response)}).`,
    );
  }
  return ok(clamp01(response) as SignalLevel);
};

// ──────────────────────────────────────────────────────────────────────────
// Effective input
// ──────────────────────────────────────────────────────────────────────────

export const effectiveInput = (
  _node: CascadeNode,
  incoming: ReadonlyArray<{
    readonly effect: EdgeEffect;
    readonly weight: EdgeWeight;
    readonly upstream: SignalLevel;
  }>,
): KernelResult<number> => {
  if (!Array.isArray(incoming)) {
    return err("precondition-violated", "incoming must be an array.");
  }
  let acc = 0;
  for (let i = 0; i < incoming.length; i += 1) {
    const entry = incoming[i];
    if (entry === undefined) {
      return err(
        "precondition-violated",
        `incoming[${i}] is undefined.`,
      );
    }
    const w = requireUnitInterval(
      entry.weight as unknown as number,
      `incoming[${i}].weight`,
    );
    if (!w.ok) return w;
    const x = requireUnitInterval(
      entry.upstream as unknown as number,
      `incoming[${i}].upstream`,
    );
    if (!x.ok) return x;
    if (entry.effect === "activate") {
      acc += w.value * x.value;
    } else if (entry.effect === "inhibit") {
      acc -= w.value * x.value;
    } else {
      return err(
        "precondition-violated",
        `incoming[${i}].effect must be "activate" or "inhibit"; got ${String(entry.effect)}.`,
      );
    }
  }
  if (!Number.isFinite(acc)) {
    return err(
      "numerical-instability",
      "effectiveInput accumulator became non-finite.",
    );
  }
  return ok(acc);
};

// ──────────────────────────────────────────────────────────────────────────
// Topological propagation
// ──────────────────────────────────────────────────────────────────────────

const topologicalOrder = (
  graph: CascadeGraph,
): KernelResult<ReadonlyArray<NodeId>> => {
  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();
  const ids = new Set<string>();
  for (const node of graph.nodes) {
    const id = node.id as unknown as string;
    if (ids.has(id)) {
      return err(
        "precondition-violated",
        `duplicate node id "${id}" in graph.`,
      );
    }
    ids.add(id);
    inDegree.set(id, 0);
    adjacency.set(id, []);
  }
  for (let i = 0; i < graph.edges.length; i += 1) {
    const edge = graph.edges[i];
    if (edge === undefined) {
      return err("precondition-violated", `graph.edges[${i}] is undefined.`);
    }
    const from = edge.from as unknown as string;
    const to = edge.to as unknown as string;
    if (!ids.has(from)) {
      return err(
        "precondition-violated",
        `edge.from "${from}" does not match any node id.`,
      );
    }
    if (!ids.has(to)) {
      return err(
        "precondition-violated",
        `edge.to "${to}" does not match any node id.`,
      );
    }
    inDegree.set(to, (inDegree.get(to) ?? 0) + 1);
    adjacency.get(from)?.push(to);
  }
  const order: string[] = [];
  const ready: string[] = [];
  for (const node of graph.nodes) {
    const id = node.id as unknown as string;
    if ((inDegree.get(id) ?? 0) === 0) ready.push(id);
  }
  while (ready.length > 0) {
    const next = ready.shift();
    if (next === undefined) break;
    order.push(next);
    const downstream = adjacency.get(next) ?? [];
    for (const downstreamId of downstream) {
      const remaining = (inDegree.get(downstreamId) ?? 0) - 1;
      inDegree.set(downstreamId, remaining);
      if (remaining === 0) ready.push(downstreamId);
    }
  }
  if (order.length !== graph.nodes.length) {
    return err(
      "precondition-violated",
      "graph contains a cycle; signal-pathway requires a DAG.",
    );
  }
  return ok(order.map((id) => id as NodeId));
};

export const propagate = (
  graph: CascadeGraph,
  inputs: ReadonlyMap<NodeId, SignalLevel>,
): KernelResult<PropagationResult> => {
  if (!Array.isArray(graph.nodes)) {
    return err("precondition-violated", "graph.nodes must be an array.");
  }
  if (!Array.isArray(graph.edges)) {
    return err("precondition-violated", "graph.edges must be an array.");
  }
  for (const node of graph.nodes) {
    const idCheck = nodeId(node.id as unknown as string);
    if (!idCheck.ok) return idCheck;
    const basal = requireUnitInterval(
      node.basal as unknown as number,
      `node "${node.id}".basal`,
    );
    if (!basal.ok) return basal;
    const threshold = requireUnitInterval(
      node.threshold as unknown as number,
      `node "${node.id}".threshold`,
    );
    if (!threshold.ok) return threshold;
    const sens = sensitivity(node.sensitivity);
    if (!sens.ok) return sens;
  }
  const order = topologicalOrder(graph);
  if (!order.ok) return order;
  const outputs = new Map<string, SignalLevel>();
  const nodeMap = new Map<string, CascadeNode>(
    graph.nodes.map((n) => [n.id as unknown as string, n]),
  );
  for (const id of order.value) {
    const idString = id as unknown as string;
    const node = nodeMap.get(idString);
    if (node === undefined) {
      return err(
        "precondition-violated",
        `internal error: node "${idString}" missing during propagation.`,
      );
    }
    const supplied = inputs.get(id);
    if (supplied !== undefined) {
      const validated = requireUnitInterval(
        supplied as unknown as number,
        `inputs.get("${idString}")`,
      );
      if (!validated.ok) return validated;
      outputs.set(idString, validated.value as SignalLevel);
      continue;
    }
    const incoming = graph.edges
      .filter((edge) => (edge.to as unknown as string) === idString)
      .map((edge) => {
        const fromString = edge.from as unknown as string;
        const upstream = outputs.get(fromString);
        return {
          effect: edge.effect,
          weight: edge.weight,
          upstream: upstream ?? (node.basal as SignalLevel),
        };
      });
    if (incoming.length === 0) {
      outputs.set(idString, node.basal as SignalLevel);
      continue;
    }
    const eff = effectiveInput(node, incoming);
    if (!eff.ok) return eff;
    const response = saturatingResponse(
      eff.value,
      node.threshold as SignalLevel,
      node.sensitivity,
    );
    if (!response.ok) return response;
    outputs.set(idString, response.value);
  }
  // Translate back to NodeId keys for the public map.
  const branded: Map<NodeId, SignalLevel> = new Map();
  for (const [key, value] of outputs) {
    branded.set(key as NodeId, value);
  }
  return ok({ outputs: branded, order: order.value });
};
