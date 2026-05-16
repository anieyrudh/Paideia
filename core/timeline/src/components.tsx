import type { Interval } from "@paideia/shared";
import type { KeyboardEvent } from "react";
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

const interactiveGroupProps = (
  id: string,
  label: string,
  onSelect: ((id: string) => void) | undefined,
) => {
  if (onSelect === undefined) return { "aria-label": label };
  return {
    "aria-label": label,
    onClick: () => onSelect(id),
    onKeyDown: (event: KeyboardEvent<SVGGElement>) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      onSelect(id);
    },
    role: "button",
    tabIndex: 0,
  };
};

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
          <g key={item.id} {...interactiveGroupProps(item.id, item.label, onSelect)}>
            <rect fill="#d1e9ff" height="16" rx="4" width={item.width} x={item.x} y={item.y - 8} />
            <text fill="#101828" fontSize="12" x={item.x} y={item.y - 12}>
              {item.label}
            </text>
          </g>
        ) : (
          <g key={item.id} {...interactiveGroupProps(item.id, item.label, onSelect)}>
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
  const times = sorted.map((item) => toMillis(item.at));
  const min = times.length === 0 ? 0 : Math.min(...times);
  const max = times.length === 0 ? 1 : Math.max(...times);
  const span = Math.max(1, max - min);
  const nodesById = new Map(sorted.map((node) => [node.id, node]));
  const positions = new Map(
    sorted.map((node, index) => [
      node.id,
      {
        x: 50 + ((toMillis(node.at) - min) / span) * 620,
        y: 48 + index * 42,
      },
    ]),
  );

  return (
    <svg aria-label="Branching timeline" role="img" viewBox={`0 0 720 ${Math.max(120, sorted.length * 48 + 40)}`}>
      {sorted.flatMap((node) =>
        (node.children ?? []).flatMap((childId) => {
          const child = nodesById.get(childId);
          const from = positions.get(node.id);
          const to = positions.get(childId);
          if (child === undefined || from === undefined || to === undefined) return [];
          return [
            <line
              key={`${node.id}:${child.id}`}
              stroke="#98a2b3"
              x1={from.x}
              x2={to.x}
              y1={from.y}
              y2={to.y}
            />,
          ];
        }),
      )}
      {sorted.flatMap((node) => {
        const position = positions.get(node.id);
        if (position === undefined) return [];
        return [
          <g key={node.id} {...interactiveGroupProps(node.id, node.label, onSelect)}>
            <circle cx={position.x} cy={position.y} fill="#1f5f8b" r="6" />
            <text fill="#101828" fontSize="12" x={position.x + 10} y={position.y + 4}>
              {node.label}
            </text>
          </g>,
        ];
      })}
    </svg>
  );
};
