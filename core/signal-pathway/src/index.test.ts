import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { approxEqual } from "@paideia/shared";

import {
  edgeWeight,
  effectiveInput,
  nodeId,
  propagate,
  saturatingResponse,
  sensitivity,
  signalLevel,
  type CascadeGraph,
  type CascadeNode,
  type NodeId,
  type SignalLevel,
} from "./index.js";

const unwrap = <T>(result: { ok: true; value: T } | { ok: false }): T => {
  if (!result.ok) throw new Error("expected ok result");
  return result.value;
};

const sl = (n: number): SignalLevel => unwrap(signalLevel(n));
const ew = (n: number) => unwrap(edgeWeight(n));
const id = (s: string): NodeId => unwrap(nodeId(s));

const seed = 0x5165_e01;

describe("constructors", () => {
  it("signalLevel and edgeWeight only accept [0, 1]", () => {
    expect(signalLevel(0).ok).toBe(true);
    expect(signalLevel(1).ok).toBe(true);
    expect(signalLevel(0.5).ok).toBe(true);
    expect(signalLevel(-0.001).ok).toBe(false);
    expect(signalLevel(1.001).ok).toBe(false);
    expect(edgeWeight(0.5).ok).toBe(true);
    expect(edgeWeight(2).ok).toBe(false);
  });

  it("nodeId rejects empty strings and non-strings", () => {
    expect(nodeId("").ok).toBe(false);
    expect(nodeId("EGFR").ok).toBe(true);
    expect(nodeId(null as unknown as string).ok).toBe(false);
  });

  it("sensitivity rejects zero and negatives", () => {
    expect(sensitivity(0).ok).toBe(false);
    expect(sensitivity(-1).ok).toBe(false);
    expect(sensitivity(5).ok).toBe(true);
  });
});

describe("saturatingResponse", () => {
  it("equals 0.5 at the threshold", () => {
    const r = unwrap(saturatingResponse(0.5, sl(0.5), 4));
    expect(r as number).toBeCloseTo(0.5, 12);
  });

  it("approaches 1 for inputs well above threshold", () => {
    const r = unwrap(saturatingResponse(1.0, sl(0.0), 20));
    expect(r as number).toBeGreaterThan(0.999);
  });

  it("approaches 0 for inputs well below threshold", () => {
    const r = unwrap(saturatingResponse(-1.0, sl(0.0), 20));
    expect(r as number).toBeLessThan(0.001);
  });

  it("is numerically stable at extreme negative inputs", () => {
    const r = unwrap(saturatingResponse(-1000, sl(0.0), 20));
    expect(Number.isFinite(r as number)).toBe(true);
    expect(r as number).toBeGreaterThanOrEqual(0);
  });

  it("monotonically increases with input (property)", () => {
    fc.assert(
      fc.property(
        fc.double({ min: -5, max: 5, noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: 0, max: 1, noNaN: true, noDefaultInfinity: true }),
        fc.double({ min: 0.1, max: 10, noNaN: true, noDefaultInfinity: true }),
        (x, t, k) => {
          const a = unwrap(saturatingResponse(x, sl(t), k)) as number;
          const b = unwrap(saturatingResponse(x + 1, sl(t), k)) as number;
          expect(b).toBeGreaterThanOrEqual(a);
        },
      ),
      { seed, numRuns: 60 },
    );
  });
});

describe("effectiveInput", () => {
  const dummy: CascadeNode = {
    id: id("X"),
    basal: sl(0),
    threshold: sl(0.5),
    sensitivity: 4,
  };

  it("sums activator and subtracts inhibitor", () => {
    const result = unwrap(
      effectiveInput(dummy, [
        { effect: "activate", weight: ew(0.5), upstream: sl(0.8) },
        { effect: "inhibit", weight: ew(1.0), upstream: sl(0.3) },
      ]),
    );
    // 0.5 * 0.8 - 1.0 * 0.3 = 0.1
    expect(result).toBeCloseTo(0.1, 12);
  });

  it("returns 0 for no incoming edges", () => {
    expect(unwrap(effectiveInput(dummy, []))).toBe(0);
  });

  it("rejects an unknown effect literal", () => {
    const result = effectiveInput(dummy, [
      {
        effect: "modulate" as unknown as "activate",
        weight: ew(0.5),
        upstream: sl(0.8),
      },
    ]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("precondition-violated");
  });
});

describe("propagate", () => {
  const buildLinear = (): CascadeGraph => ({
    nodes: [
      { id: id("ligand"), basal: sl(0), threshold: sl(0.1), sensitivity: 8 },
      { id: id("receptor"), basal: sl(0), threshold: sl(0.5), sensitivity: 8 },
      { id: id("kinase"), basal: sl(0), threshold: sl(0.5), sensitivity: 8 },
      { id: id("tf"), basal: sl(0), threshold: sl(0.5), sensitivity: 8 },
    ],
    edges: [
      { from: id("ligand"), to: id("receptor"), effect: "activate", weight: ew(1) },
      { from: id("receptor"), to: id("kinase"), effect: "activate", weight: ew(1) },
      { from: id("kinase"), to: id("tf"), effect: "activate", weight: ew(1) },
    ],
  });

  it("propagates a high input down a 4-stage linear chain", () => {
    const graph = buildLinear();
    const inputs = new Map<NodeId, SignalLevel>([[id("ligand"), sl(1)]]);
    const result = unwrap(propagate(graph, inputs));
    expect(result.order).toHaveLength(4);
    expect(result.outputs.get(id("ligand")) as number).toBe(1);
    expect((result.outputs.get(id("tf")) as number) ?? 0).toBeGreaterThan(0.9);
  });

  it("propagates a zero input to near-zero downstream", () => {
    const graph = buildLinear();
    const inputs = new Map<NodeId, SignalLevel>([[id("ligand"), sl(0)]]);
    const result = unwrap(propagate(graph, inputs));
    expect((result.outputs.get(id("tf")) as number) ?? 1).toBeLessThan(0.1);
  });

  it("handles an inhibitor edge", () => {
    const graph: CascadeGraph = {
      nodes: [
        { id: id("A"), basal: sl(0), threshold: sl(0.5), sensitivity: 8 },
        { id: id("B"), basal: sl(0), threshold: sl(0.5), sensitivity: 8 },
        { id: id("C"), basal: sl(0), threshold: sl(0), sensitivity: 8 },
      ],
      edges: [
        { from: id("A"), to: id("C"), effect: "activate", weight: ew(1) },
        { from: id("B"), to: id("C"), effect: "inhibit", weight: ew(1) },
      ],
    };
    const high = unwrap(
      propagate(
        graph,
        new Map<NodeId, SignalLevel>([[id("A"), sl(1)], [id("B"), sl(0)]]),
      ),
    );
    const inhibited = unwrap(
      propagate(
        graph,
        new Map<NodeId, SignalLevel>([[id("A"), sl(1)], [id("B"), sl(1)]]),
      ),
    );
    expect((high.outputs.get(id("C")) as number)).toBeGreaterThan(
      (inhibited.outputs.get(id("C")) as number),
    );
  });

  it("rejects cycles", () => {
    const cyclic: CascadeGraph = {
      nodes: [
        { id: id("A"), basal: sl(0), threshold: sl(0.5), sensitivity: 4 },
        { id: id("B"), basal: sl(0), threshold: sl(0.5), sensitivity: 4 },
      ],
      edges: [
        { from: id("A"), to: id("B"), effect: "activate", weight: ew(1) },
        { from: id("B"), to: id("A"), effect: "activate", weight: ew(1) },
      ],
    };
    const result = propagate(cyclic, new Map());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("precondition-violated");
  });

  it("rejects edges referencing unknown nodes", () => {
    const orphan: CascadeGraph = {
      nodes: [{ id: id("A"), basal: sl(0), threshold: sl(0.5), sensitivity: 4 }],
      edges: [{ from: id("A"), to: id("B"), effect: "activate", weight: ew(1) }],
    };
    const result = propagate(orphan, new Map());
    expect(result.ok).toBe(false);
  });

  it("rejects duplicate node ids", () => {
    const dup: CascadeGraph = {
      nodes: [
        { id: id("A"), basal: sl(0), threshold: sl(0.5), sensitivity: 4 },
        { id: id("A"), basal: sl(0), threshold: sl(0.5), sensitivity: 4 },
      ],
      edges: [],
    };
    const result = propagate(dup, new Map());
    expect(result.ok).toBe(false);
  });

  it("uses basal when an isolated node receives no input", () => {
    const isolated: CascadeGraph = {
      nodes: [
        { id: id("A"), basal: sl(0.42), threshold: sl(0.5), sensitivity: 4 },
      ],
      edges: [],
    };
    const result = unwrap(propagate(isolated, new Map()));
    expect(approxEqual(result.outputs.get(id("A")) as number, 0.42, 1e-12)).toBe(
      true,
    );
  });
});
