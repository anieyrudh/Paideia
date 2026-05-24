import fc from "fast-check";
import { describe, expect, it } from "vitest";

import {
  adjacencyFor,
  argumentBalance,
  argumentNodeId,
  argumentRelationId,
  detectCycles,
  neighborhood,
  topologicalArgumentOrder,
  validateArgumentGraph,
  type ArgumentGraph,
  type ArgumentNodeId,
  type ArgumentRelationId,
} from "./index.js";

const nodeId = (value: string): ArgumentNodeId => {
  const result = argumentNodeId(value);
  if (!result.ok) throw new Error(result.error.message);
  return result.value;
};

const relationId = (value: string): ArgumentRelationId => {
  const result = argumentRelationId(value);
  if (!result.ok) throw new Error(result.error.message);
  return result.value;
};

const requiredPosition = (
  positions: ReadonlyMap<ArgumentNodeId, number>,
  id: ArgumentNodeId,
): number => {
  const position = positions.get(id);
  if (position === undefined) throw new Error(`Missing position for ${id}`);
  return position;
};

const claim = nodeId("claim");
const evidence = nodeId("evidence");
const rebuttal = nodeId("rebuttal");
const support = relationId("support");
const attack = relationId("attack");

const graph: ArgumentGraph = {
  nodes: [
    { id: claim, kind: "claim", label: "The design is stable." },
    { id: evidence, kind: "evidence", label: "The step response is bounded.", sourceId: "lab-note-1" },
    { id: rebuttal, kind: "rebuttal", label: "The test excludes disturbance cases." },
  ],
  relations: [
    { id: support, kind: "supports", from: evidence, to: claim, weight: 0.8 },
    { id: attack, kind: "attacks", from: rebuttal, to: claim, weight: 0.3 },
  ],
};

describe("argument ids", () => {
  it("brands valid ids and rejects whitespace or reserved object keys", () => {
    expect(argumentNodeId("claim_1").ok).toBe(true);
    expect(argumentRelationId("supports_1").ok).toBe(true);
    expect(argumentNodeId("").ok).toBe(false);
    expect(argumentNodeId("claim 1").ok).toBe(false);
    expect(argumentNodeId(" claim").ok).toBe(false);
    expect(argumentNodeId("__proto__").ok).toBe(false);
    expect(argumentNodeId("prototype").ok).toBe(false);
    expect(argumentNodeId("constructor").ok).toBe(false);
  });
});

describe("validateArgumentGraph", () => {
  it("accepts a valid argument graph without mutating it", () => {
    const before = JSON.stringify(graph);
    const result = validateArgumentGraph(graph);

    expect(result).toEqual({ ok: true, value: graph });
    expect(JSON.stringify(graph)).toBe(before);
  });

  it("rejects duplicate nodes, duplicate relations, bad kinds, labels, endpoints, self edges, and weights", () => {
    expect(validateArgumentGraph({ nodes: [graph.nodes[0]!, graph.nodes[0]!], relations: [] }).ok).toBe(false);
    expect(validateArgumentGraph({ nodes: graph.nodes, relations: [graph.relations[0]!, graph.relations[0]!] }).ok).toBe(false);
    expect(validateArgumentGraph({ nodes: [{ id: claim, kind: "claim", label: " bad " }], relations: [] }).ok).toBe(false);
    expect(validateArgumentGraph({
      nodes: [{ id: claim, kind: "bogus" as "claim", label: "A claim" }],
      relations: [],
    }).ok).toBe(false);
    expect(validateArgumentGraph({
      nodes: graph.nodes,
      relations: [{ id: support, kind: "bogus" as "supports", from: evidence, to: claim }],
    }).ok).toBe(false);
    expect(validateArgumentGraph({
      nodes: graph.nodes,
      relations: [{ id: support, kind: "supports", from: evidence, to: nodeId("missing") }],
    }).ok).toBe(false);
    expect(validateArgumentGraph({
      nodes: graph.nodes,
      relations: [{ id: support, kind: "supports", from: claim, to: claim }],
    }).ok).toBe(false);
    expect(validateArgumentGraph({
      nodes: graph.nodes,
      relations: [{ id: support, kind: "supports", from: evidence, to: claim, weight: -1 }],
    }).ok).toBe(false);
  });
});

describe("adjacency and balance", () => {
  it("returns incoming and outgoing relations in graph order", () => {
    const result = adjacencyFor(graph, claim);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.incoming.map((relation) => relation.id)).toEqual([support, attack]);
    expect(result.value.outgoing).toEqual([]);
  });

  it("summarizes incoming support and attack weights without deciding truth", () => {
    const warrant = nodeId("warrant");
    const question = nodeId("question");
    const qualified: ArgumentGraph = {
      nodes: [
        ...graph.nodes,
        { id: warrant, kind: "warrant", label: "The test setup is representative." },
        { id: question, kind: "question", label: "What happens under load?" },
      ],
      relations: [
        ...graph.relations,
        { id: relationId("qualify"), kind: "qualifies", from: warrant, to: claim, weight: 0.2 },
        { id: relationId("depends"), kind: "depends-on", from: question, to: claim, weight: 0.4 },
      ],
    };
    const result = argumentBalance(qualified, claim);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.supports).toBe(0.8);
    expect(result.value.attacks).toBe(0.3);
    expect(result.value.qualifies).toBe(0.2);
    expect(result.value.dependsOn).toBe(0.4);
    expect(result.value.netSupport).toBeCloseTo(0.5);
  });
});

describe("cycle detection and topological order", () => {
  it("detects relation cycles and rejects topological order for cyclic graphs", () => {
    const cyclic: ArgumentGraph = {
      nodes: graph.nodes,
      relations: [
        ...graph.relations,
        { id: relationId("counter"), kind: "depends-on", from: claim, to: evidence },
      ],
    };

    const cycles = detectCycles(cyclic);
    expect(cycles.ok).toBe(true);
    if (!cycles.ok) return;
    expect(cycles.value).toHaveLength(1);
    expect(topologicalArgumentOrder(cyclic).ok).toBe(false);
  });

  it("returns a deterministic topological order for acyclic graphs", () => {
    const result = topologicalArgumentOrder(graph);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toEqual([evidence, rebuttal, claim]);
  });

  it("keeps newly ready nodes in graph node order for branching DAGs", () => {
    const a = nodeId("a");
    const b = nodeId("b");
    const c = nodeId("c");
    const result = topologicalArgumentOrder({
      nodes: [
        { id: a, kind: "claim", label: "A" },
        { id: b, kind: "claim", label: "B" },
        { id: c, kind: "claim", label: "C" },
      ],
      relations: [
        { id: relationId("ac"), kind: "supports", from: a, to: c },
        { id: relationId("ab"), kind: "supports", from: a, to: b },
      ],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toEqual([a, b, c]);
  });

  it("property: every relation's from node appears before its to node in DAG order", () => {
    fc.assert(
      fc.property(fc.integer({ min: 2, max: 20 }), (count) => {
        const nodes = Array.from({ length: count }, (_, index) => ({
          id: nodeId(`n${index}`),
          kind: "claim" as const,
          label: `Node ${index}`,
        }));
        const relations = Array.from({ length: count - 1 }, (_, index) => ({
          id: relationId(`r${index}`),
          kind: "supports" as const,
          from: nodes[index]!.id,
          to: nodes[index + 1]!.id,
        }));
        const result = topologicalArgumentOrder({ nodes, relations });

        expect(result.ok).toBe(true);
        if (!result.ok) return;
        const positions: ReadonlyMap<ArgumentNodeId, number> = new Map(
          result.value.map((id, index) => [id, index]),
        );
        for (const relation of relations) {
          expect(requiredPosition(positions, relation.from)).toBeLessThan(
            requiredPosition(positions, relation.to),
          );
        }
      }),
    );
  });

  it("property: branching DAG order preserves node input order when dependencies allow", () => {
    fc.assert(
      fc.property(fc.integer({ min: 3, max: 20 }), (count) => {
        const nodes = Array.from({ length: count }, (_, index) => ({
          id: nodeId(`branch${index}`),
          kind: "claim" as const,
          label: `Branch ${index}`,
        }));
        const relations = nodes.slice(1).reverse().map((node, index) => ({
          id: relationId(`branchRelation${index}`),
          kind: "supports" as const,
          from: nodes[0]!.id,
          to: node.id,
        }));
        const result = topologicalArgumentOrder({ nodes, relations });

        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect(result.value).toEqual(nodes.map((node) => node.id));
      }),
    );
  });
});

describe("neighborhood", () => {
  it("extracts local neighborhoods by undirected distance", () => {
    const result = neighborhood(graph, claim, 1);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.center.id).toBe(claim);
    expect(result.value.nodes.map((node) => node.id)).toEqual([claim, evidence, rebuttal]);
    expect(result.value.relations.map((relation) => relation.id)).toEqual([support, attack]);
  });

  it("rejects unknown centers and invalid depths", () => {
    expect(neighborhood(graph, nodeId("missing"), 1).ok).toBe(false);
    expect(neighborhood(graph, claim, -1).ok).toBe(false);
    expect(neighborhood(graph, claim, 1.5).ok).toBe(false);
  });
});
