import { err, ok, type KernelResult } from "@paideia/shared";
import {
  forceCenter,
  forceLink,
  forceManyBody,
  forceSimulation,
  type SimulationLinkDatum,
  type SimulationNodeDatum,
} from "d3-force";
import {
  forceCenter as forceCenter3D,
  forceLink as forceLink3D,
  forceManyBody as forceManyBody3D,
  forceSimulation as forceSimulation3D,
  type SimulationLinkDatum as SimulationLinkDatum3D,
  type SimulationNodeDatum as SimulationNodeDatum3D,
} from "d3-force-3d";
import type {
  ForceDirected2DOptions,
  ForceDirected3DOptions,
  Graph,
  LayoutResult2D,
  LayoutResult3D,
} from "./types.js";
import { validateGraph } from "./validation.js";

interface MutablePoint2D {
  readonly id: string;
  x: number;
  y: number;
  readonly mass: number;
}

interface MutablePoint3D extends MutablePoint2D {
  z: number;
}

type D3Node2D = MutablePoint2D & SimulationNodeDatum;
type D3Link2D = SimulationLinkDatum<D3Node2D> & {
  readonly strengthValue: number;
};
type D3Node3D = MutablePoint3D & SimulationNodeDatum3D;
type D3Link3D = SimulationLinkDatum3D<D3Node3D> & {
  readonly strengthValue: number;
};

const normalizeIterations = (value: number | undefined, fallback: number): KernelResult<number> => {
  const iterations = value ?? fallback;
  return Number.isInteger(iterations) && iterations >= 0 && iterations <= 10_000
    ? ok(iterations)
    : err("precondition-violated", "iterations must be an integer in [0, 10000]");
};

const finiteOr = (value: number | undefined, fallback: number): KernelResult<number> => {
  const resolved = value ?? fallback;
  return Number.isFinite(resolved)
    ? ok(resolved)
    : err("precondition-violated", "layout numeric options must be finite");
};

const seededUnit = (seed: number, index: number, axis: number): number => {
  let state = (seed >>> 0) ^ Math.imul(index + 1, 0x9e3779b1) ^ Math.imul(axis + 1, 0x85ebca6b);
  state ^= state >>> 16;
  state = Math.imul(state, 0x7feb352d);
  state ^= state >>> 15;
  state = Math.imul(state, 0x846ca68b);
  state ^= state >>> 16;
  return (state >>> 0) / 4_294_967_296;
};

const seededRandom = (seed: number): () => number => {
  let state = seed >>> 0;
  return () => {
    state = Math.imul(1664525, state) + 1013904223;
    return (state >>> 0) / 4_294_967_296;
  };
};

const initial2D = (graph: Graph, seed: number): D3Node2D[] => {
  const n = Math.max(graph.nodes.length, 1);
  return graph.nodes.map((node, index) => {
    const angle = (2 * Math.PI * index) / n + seededUnit(seed, index, 0) * 0.5;
    const radius = 24 + 12 * seededUnit(seed, index, 1) + Math.sqrt(index + 1) * 8;
    return {
      id: node.id,
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
      mass: node.weight ?? 1,
    };
  });
};

const initial3D = (graph: Graph, seed: number): D3Node3D[] =>
  initial2D(graph, seed).map((node, index) => ({
    ...node,
    z: (seededUnit(seed, index, 2) - 0.5) * 48,
  }));

const exportedLinks = (graph: Graph) =>
  graph.links.map((link) => ({ source: link.source, target: link.target }));

const d3Links2D = (graph: Graph): D3Link2D[] =>
  graph.links.map((link) => ({
    source: link.source,
    target: link.target,
    strengthValue: link.strength ?? 1,
  }));

const d3Links3D = (graph: Graph): D3Link3D[] =>
  graph.links.map((link) => ({
    source: link.source,
    target: link.target,
    strengthValue: link.strength ?? 1,
  }));

export const forceDirected2D = (
  graph: Graph,
  opts: ForceDirected2DOptions = {},
): KernelResult<LayoutResult2D> => {
  const valid = validateGraph(graph);
  if (!valid.ok) return valid;

  const iterationsResult = normalizeIterations(opts.iterations, 120);
  if (!iterationsResult.ok) return iterationsResult;
  const chargeResult = finiteOr(opts.charge, -120);
  if (!chargeResult.ok) return chargeResult;
  const distanceResult = finiteOr(opts.linkDistance, 80);
  if (!distanceResult.ok) return distanceResult;

  const seed = opts.seed ?? 0;
  const nodes = initial2D(graph, seed);
  const links = d3Links2D(graph);

  forceSimulation(nodes)
    .randomSource(seededRandom(seed))
    .force("charge", forceManyBody<D3Node2D>().strength(chargeResult.value))
    .force(
      "link",
      forceLink<D3Node2D, D3Link2D>(links)
        .id((node) => node.id)
        .distance(distanceResult.value)
        .strength((link) => link.strengthValue),
    )
    .force("center", forceCenter<D3Node2D>(0, 0))
    .stop()
    .tick(iterationsResult.value);

  return ok({
    nodes: nodes.map((node) => ({ id: node.id, x: node.x, y: node.y })),
    links: exportedLinks(graph),
  });
};

export const forceDirected3D = (
  graph: Graph,
  opts: ForceDirected3DOptions = {},
): KernelResult<LayoutResult3D> => {
  const valid = validateGraph(graph);
  if (!valid.ok) return valid;

  const iterationsResult = normalizeIterations(opts.iterations, 140);
  if (!iterationsResult.ok) return iterationsResult;

  const seed = opts.seed ?? 0;
  const nodes = initial3D(graph, seed);
  const links = d3Links3D(graph);

  forceSimulation3D(nodes, 3)
    .randomSource(seededRandom(seed))
    .force("charge", forceManyBody3D<D3Node3D>().strength(-90))
    .force(
      "link",
      forceLink3D<D3Node3D, D3Link3D>(links)
        .id((node) => node.id)
        .distance(90)
        .strength((link) => link.strengthValue),
    )
    .force("center", forceCenter3D<D3Node3D>(0, 0, 0))
    .stop()
    .tick(iterationsResult.value);

  return ok({
    nodes: nodes.map((node) => ({ id: node.id, x: node.x, y: node.y, z: node.z })),
    links: exportedLinks(graph),
  });
};
