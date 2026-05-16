import { err, ok, type Interval, type KernelResult } from "@paideia/shared";

export interface TimelineEvent {
  readonly id: string;
  readonly at: Date | number;
  readonly label: string;
  readonly lane?: string;
  readonly meta?: Readonly<Record<string, unknown>>;
}

export interface TimelineSpan {
  readonly id: string;
  readonly from: Date | number;
  readonly to: Date | number;
  readonly label: string;
  readonly lane?: string;
  readonly meta?: Readonly<Record<string, unknown>>;
}

export type BranchingTimelineNode = TimelineEvent & {
  readonly parents?: readonly string[];
  readonly children?: readonly string[];
};

export interface LaidOutItem {
  readonly id: string;
  readonly kind: "event" | "span";
  readonly label: string;
  readonly lane: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
}

interface LayoutOptions {
  readonly domain?: Interval;
  readonly lanes?: readonly string[];
  readonly width?: number;
  readonly laneHeight?: number;
  readonly branchNodes?: readonly BranchingTimelineNode[];
}

const PADDING_X = 40;
const PADDING_Y = 28;

export const toMillis = (value: Date | number): number =>
  value instanceof Date ? value.getTime() : value;

const validMillis = (value: Date | number): boolean => Number.isFinite(toMillis(value));

const inferDomain = (
  events: readonly TimelineEvent[],
  spans: readonly TimelineSpan[],
): Interval => {
  const values = [
    ...events.map((event) => toMillis(event.at)),
    ...spans.flatMap((span) => [toMillis(span.from), toMillis(span.to)]),
  ];
  if (values.length === 0) return { min: 0, max: 1 };
  const min = Math.min(...values);
  const max = Math.max(...values);
  return min === max ? { min: min - 1, max: max + 1 } : { min, max };
};

const laneOrder = (
  events: readonly TimelineEvent[],
  spans: readonly TimelineSpan[],
  explicit: readonly string[] | undefined,
): readonly string[] => {
  if (explicit !== undefined) return [...explicit];
  const lanes: string[] = [];
  for (const lane of [
    ...events.map((event) => event.lane ?? "default"),
    ...spans.map((span) => span.lane ?? "default"),
  ]) {
    if (!lanes.includes(lane)) lanes.push(lane);
  }
  return lanes.length === 0 ? ["default"] : lanes;
};

const xFor = (value: number, domain: Interval, width: number): number =>
  PADDING_X + ((value - domain.min) / (domain.max - domain.min)) * (width - PADDING_X * 2);

export const layoutTimeline = (
  events: readonly TimelineEvent[],
  spans: readonly TimelineSpan[] = [],
  opts: LayoutOptions = {},
): KernelResult<{
  readonly items: readonly LaidOutItem[];
  readonly width: number;
  readonly height: number;
}> => {
  if (opts.branchNodes !== undefined) {
    const branchValidation = validateBranchingTimeline(opts.branchNodes);
    if (!branchValidation.ok) return branchValidation;
  }

  for (const event of events) {
    if (!validMillis(event.at)) {
      return err("precondition-violated", `Timeline event ${event.id} has a non-finite time`);
    }
  }
  for (const span of spans) {
    const from = toMillis(span.from);
    const to = toMillis(span.to);
    if (!Number.isFinite(from) || !Number.isFinite(to) || from >= to) {
      return err("precondition-violated", `Timeline span ${span.id} must satisfy from < to`);
    }
  }

  const domain = opts.domain ?? inferDomain(events, spans);
  if (!Number.isFinite(domain.min) || !Number.isFinite(domain.max) || domain.min >= domain.max) {
    return err("precondition-violated", "Timeline domain must satisfy min < max");
  }

  const lanes = laneOrder(events, spans, opts.lanes);
  const width = opts.width ?? 720;
  const laneHeight = opts.laneHeight ?? 54;
  if (!Number.isFinite(width) || width <= PADDING_X * 2) {
    return err(
      "precondition-violated",
      "Timeline width must be finite and greater than horizontal padding",
    );
  }
  if (!Number.isFinite(laneHeight) || laneHeight <= 0) {
    return err("precondition-violated", "Timeline laneHeight must be finite and positive");
  }

  const laneY = new Map(lanes.map((lane, index) => [lane, PADDING_Y + index * laneHeight]));
  const laneFor = (lane: string | undefined): string =>
    lane !== undefined && laneY.has(lane) ? lane : lanes[0] ?? "default";

  const eventItems = [...events]
    .sort((a, b) => toMillis(a.at) - toMillis(b.at))
    .map((event): LaidOutItem => {
      const lane = laneFor(event.lane);
      return {
        id: event.id,
        kind: "event",
        label: event.label,
        lane,
        x: xFor(toMillis(event.at), domain, width),
        y: laneY.get(lane) ?? PADDING_Y,
        width: 0,
      };
    });
  const spanItems = [...spans]
    .sort((a, b) => toMillis(a.from) - toMillis(b.from))
    .map((span): LaidOutItem => {
      const lane = laneFor(span.lane);
      const x = xFor(toMillis(span.from), domain, width);
      return {
        id: span.id,
        kind: "span",
        label: span.label,
        lane,
        x,
        y: laneY.get(lane) ?? PADDING_Y,
        width: xFor(toMillis(span.to), domain, width) - x,
      };
    });

  return ok({
    items: [...spanItems, ...eventItems],
    width,
    height: PADDING_Y * 2 + lanes.length * laneHeight,
  });
};

export const hasCycle = (nodes: readonly BranchingTimelineNode[]): boolean => {
  const graph = new Map<string, readonly string[]>();
  for (const node of nodes) {
    graph.set(node.id, node.children ?? []);
  }
  const visiting = new Set<string>();
  const visited = new Set<string>();

  const visit = (id: string): boolean => {
    if (visiting.has(id)) return true;
    if (visited.has(id)) return false;
    visiting.add(id);
    for (const child of graph.get(id) ?? []) {
      if (visit(child)) return true;
    }
    visiting.delete(id);
    visited.add(id);
    return false;
  };

  return nodes.some((node) => visit(node.id));
};

export const validateBranchingTimeline = (
  nodes: readonly BranchingTimelineNode[],
): KernelResult<void> => {
  const ids = new Set<string>();
  for (const node of nodes) {
    if (ids.has(node.id)) {
      return err("precondition-violated", `Duplicate branching timeline node id: ${node.id}`);
    }
    ids.add(node.id);
  }

  for (const node of nodes) {
    for (const childId of node.children ?? []) {
      if (!ids.has(childId)) {
        return err(
          "precondition-violated",
          `Branching timeline child does not exist: ${childId}`,
        );
      }
    }
    for (const parentId of node.parents ?? []) {
      if (!ids.has(parentId)) {
        return err(
          "precondition-violated",
          `Branching timeline parent does not exist: ${parentId}`,
        );
      }
    }
  }

  return hasCycle(nodes)
    ? err("precondition-violated", "Branching timeline graph must be acyclic")
    : ok(undefined);
};
