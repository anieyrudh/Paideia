import type { Interval } from "@paideia/shared";
import {
  layoutTimeline,
  toMillis,
  type BranchingTimelineNode,
  type TimelineEvent,
  type TimelineSpan,
} from "./layout.js";

interface TimelineProps {
  readonly events: readonly TimelineEvent[];
  readonly spans?: readonly TimelineSpan[];
  readonly domain?: Interval;
  readonly lanes?: readonly string[];
  readonly onSelect?: (id: string) => void;
}

interface BranchingTimelineProps {
  readonly nodes: readonly BranchingTimelineNode[];
  readonly onSelect?: (id: string) => void;
}

export const Timeline = ({
  events,
  spans = [],
  domain,
  lanes,
  onSelect,
}: TimelineProps) => {
  const layout = layoutTimeline(events, spans, {
    ...(domain === undefined ? {} : { domain }),
    ...(lanes === undefined ? {} : { lanes }),
  });
  if (!layout.ok) {
    return <svg aria-label={layout.error.message} role="img" viewBox="0 0 720 120" />;
  }

  return (
    <svg
      aria-label="Timeline"
      role="img"
      viewBox={`0 0 ${layout.value.width} ${layout.value.height}`}
    >
      <line
        stroke="#667085"
        x1="40"
        x2={layout.value.width - 40}
        y1={layout.value.height - 24}
        y2={layout.value.height - 24}
      />
      {layout.value.items.map((item) =>
        item.kind === "span" ? (
          <g key={item.id} onClick={() => onSelect?.(item.id)}>
            <rect fill="#d1e9ff" height="16" rx="4" width={item.width} x={item.x} y={item.y - 8} />
            <text fill="#101828" fontSize="12" x={item.x} y={item.y - 12}>
              {item.label}
            </text>
          </g>
        ) : (
          <g key={item.id} onClick={() => onSelect?.(item.id)}>
            <circle cx={item.x} cy={item.y} fill="#1f5f8b" r="5" />
            <text fill="#101828" fontSize="12" x={item.x + 8} y={item.y + 4}>
              {item.label}
            </text>
          </g>
        ),
      )}
    </svg>
  );
};

export const BranchingTimeline = ({
  nodes,
  onSelect,
}: BranchingTimelineProps) => {
  const valid = layoutTimeline(nodes, [], { branchNodes: nodes });
  if (!valid.ok) {
    return <svg aria-label={valid.error.message} role="img" viewBox="0 0 720 120" />;
  }

  const sorted = [...nodes].sort((a, b) => toMillis(a.at) - toMillis(b.at));
  const xFor = (node: BranchingTimelineNode): number => {
    const min = Math.min(...sorted.map((item) => toMillis(item.at)));
    const max = Math.max(...sorted.map((item) => toMillis(item.at)));
    return 50 + ((toMillis(node.at) - min) / Math.max(1, max - min)) * 620;
  };
  const yFor = (node: BranchingTimelineNode): number =>
    48 + Math.max(0, sorted.findIndex((item) => item.id === node.id)) * 42;

  return (
    <svg aria-label="Branching timeline" role="img" viewBox={`0 0 720 ${Math.max(120, sorted.length * 48 + 40)}`}>
      {sorted.flatMap((node) =>
        (node.children ?? []).flatMap((childId) => {
          const child = sorted.find((candidate) => candidate.id === childId);
          if (child === undefined) return [];
          return [
            <line
              key={`${node.id}:${child.id}`}
              stroke="#98a2b3"
              x1={xFor(node)}
              x2={xFor(child)}
              y1={yFor(node)}
              y2={yFor(child)}
            />,
          ];
        }),
      )}
      {sorted.map((node) => (
        <g key={node.id} onClick={() => onSelect?.(node.id)}>
          <circle cx={xFor(node)} cy={yFor(node)} fill="#1f5f8b" r="6" />
          <text fill="#101828" fontSize="12" x={xFor(node) + 10} y={yFor(node) + 4}>
            {node.label}
          </text>
        </g>
      ))}
    </svg>
  );
};
