import { err, ok, type KernelResult } from "@paideia/shared";
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
  vx: number;
  vy: number;
  readonly mass: number;
}

interface MutablePoint3D extends MutablePoint2D {
  z: number;
  vz: number;
}

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

const initial2D = (graph: Graph, seed: number): MutablePoint2D[] => {
  const n = Math.max(graph.nodes.length, 1);
  return graph.nodes.map((node, index) => {
    const angle = (2 * Math.PI * index) / n + seededUnit(seed, index, 0) * 0.5;
    const radius = 24 + 12 * seededUnit(seed, index, 1) + Math.sqrt(index + 1) * 8;
    return {
      id: node.id,
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
      vx: 0,
      vy: 0,
      mass: node.weight ?? 1,
    };
  });
};

const initial3D = (graph: Graph, seed: number): MutablePoint3D[] =>
  initial2D(graph, seed).map((node, index) => ({
    ...node,
    z: (seededUnit(seed, index, 2) - 0.5) * 48,
    vz: 0,
  }));

const exportedLinks = (graph: Graph) =>
  graph.links.map((link) => ({ source: link.source, target: link.target }));

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

  const nodes = initial2D(graph, opts.seed ?? 0);
  const iterations = iterationsResult.value;
  const charge = chargeResult.value;
  const linkDistance = distanceResult.value;

  for (let tick = 0; tick < iterations; tick += 1) {
    const alpha = 1 - tick / Math.max(iterations, 1);

    for (let i = 0; i < nodes.length; i += 1) {
      const a = nodes[i];
      if (a === undefined) continue;
      for (let j = i + 1; j < nodes.length; j += 1) {
        const b = nodes[j];
        if (b === undefined) continue;
        const dx = b.x - a.x || 0.0001;
        const dy = b.y - a.y || 0.0001;
        const distanceSquared = dx * dx + dy * dy + 0.01;
        const distance = Math.sqrt(distanceSquared);
        const force = (charge * alpha) / distanceSquared;
        const fx = (dx / distance) * force;
        const fy = (dy / distance) * force;
        a.vx += fx / a.mass;
        a.vy += fy / a.mass;
        b.vx -= fx / b.mass;
        b.vy -= fy / b.mass;
      }
    }

    for (const link of graph.links) {
      const sourceIndex = valid.value.get(link.source);
      const targetIndex = valid.value.get(link.target);
      if (sourceIndex === undefined || targetIndex === undefined) continue;
      const source = nodes[sourceIndex];
      const target = nodes[targetIndex];
      if (source === undefined || target === undefined) continue;
      const dx = target.x - source.x || 0.0001;
      const dy = target.y - source.y || 0.0001;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const strength = (link.strength ?? 1) * 0.08 * alpha;
      const force = ((distance - linkDistance) / distance) * strength;
      const fx = dx * force;
      const fy = dy * force;
      source.vx += fx / source.mass;
      source.vy += fy / source.mass;
      target.vx -= fx / target.mass;
      target.vy -= fy / target.mass;
    }

    for (const node of nodes) {
      node.vx = (node.vx - node.x * 0.002 * alpha) * 0.82;
      node.vy = (node.vy - node.y * 0.002 * alpha) * 0.82;
      node.x += node.vx;
      node.y += node.vy;
    }
  }

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

  const nodes = initial3D(graph, opts.seed ?? 0);

  for (let tick = 0; tick < iterationsResult.value; tick += 1) {
    const alpha = 1 - tick / Math.max(iterationsResult.value, 1);

    for (let i = 0; i < nodes.length; i += 1) {
      const a = nodes[i];
      if (a === undefined) continue;
      for (let j = i + 1; j < nodes.length; j += 1) {
        const b = nodes[j];
        if (b === undefined) continue;
        const dx = b.x - a.x || 0.0001;
        const dy = b.y - a.y || 0.0001;
        const dz = b.z - a.z || 0.0001;
        const distanceSquared = dx * dx + dy * dy + dz * dz + 0.01;
        const distance = Math.sqrt(distanceSquared);
        const force = (-90 * alpha) / distanceSquared;
        const fx = (dx / distance) * force;
        const fy = (dy / distance) * force;
        const fz = (dz / distance) * force;
        a.vx += fx / a.mass;
        a.vy += fy / a.mass;
        a.vz += fz / a.mass;
        b.vx -= fx / b.mass;
        b.vy -= fy / b.mass;
        b.vz -= fz / b.mass;
      }
    }

    for (const link of graph.links) {
      const sourceIndex = valid.value.get(link.source);
      const targetIndex = valid.value.get(link.target);
      if (sourceIndex === undefined || targetIndex === undefined) continue;
      const source = nodes[sourceIndex];
      const target = nodes[targetIndex];
      if (source === undefined || target === undefined) continue;
      const dx = target.x - source.x || 0.0001;
      const dy = target.y - source.y || 0.0001;
      const dz = target.z - source.z || 0.0001;
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const force = ((distance - 90) / distance) * (link.strength ?? 1) * 0.075 * alpha;
      source.vx += (dx * force) / source.mass;
      source.vy += (dy * force) / source.mass;
      source.vz += (dz * force) / source.mass;
      target.vx -= (dx * force) / target.mass;
      target.vy -= (dy * force) / target.mass;
      target.vz -= (dz * force) / target.mass;
    }

    for (const node of nodes) {
      node.vx = (node.vx - node.x * 0.0015 * alpha) * 0.84;
      node.vy = (node.vy - node.y * 0.0015 * alpha) * 0.84;
      node.vz = (node.vz - node.z * 0.0015 * alpha) * 0.84;
      node.x += node.vx;
      node.y += node.vy;
      node.z += node.vz;
    }
  }

  return ok({
    nodes: nodes.map((node) => ({ id: node.id, x: node.x, y: node.y, z: node.z })),
    links: exportedLinks(graph),
  });
};
