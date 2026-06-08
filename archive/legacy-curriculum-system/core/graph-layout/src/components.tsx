import type { KeyboardEvent } from "react";
import type { LayoutResult2D, LayoutResult3D } from "./types.js";

export interface ForceGraph2DProps {
  readonly layout: LayoutResult2D;
  readonly onNodeClick?: (id: string) => void;
}

export interface ForceGraph3DProps {
  readonly layout: LayoutResult3D;
}

export interface TreeProps {
  readonly layout: LayoutResult2D;
}

const viewBox2D = (layout: LayoutResult2D): string => {
  if (layout.nodes.length === 0) return "0 0 1 1";
  const xs = layout.nodes.map((node) => node.x);
  const ys = layout.nodes.map((node) => node.y);
  const minX = Math.min(...xs) - 32;
  const maxX = Math.max(...xs) + 32;
  const minY = Math.min(...ys) - 32;
  const maxY = Math.max(...ys) + 32;
  return `${minX} ${minY} ${Math.max(maxX - minX, 1)} ${Math.max(maxY - minY, 1)}`;
};

const nodeMap2D = (layout: LayoutResult2D): ReadonlyMap<string, { readonly x: number; readonly y: number }> =>
  new Map(layout.nodes.map((node) => [node.id, { x: node.x, y: node.y }]));

export const ForceGraph2D = ({ layout, onNodeClick }: ForceGraph2DProps) => {
  const positions = nodeMap2D(layout);
  const activateNode = (id: string) => {
    onNodeClick?.(id);
  };
  const handleNodeKeyDown = (event: KeyboardEvent<SVGGElement>, id: string) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    activateNode(id);
  };

  return (
    <svg aria-label="Force-directed graph" role="img" viewBox={viewBox2D(layout)}>
      <g stroke="currentColor" strokeOpacity={0.35}>
        {layout.links.map((link, index) => {
          const source = positions.get(link.source);
          const target = positions.get(link.target);
          if (source === undefined || target === undefined) return null;
          return (
            <line
              key={`${link.source}->${link.target}:${index}`}
              x1={source.x}
              x2={target.x}
              y1={source.y}
              y2={target.y}
            />
          );
        })}
      </g>
      <g>
        {layout.nodes.map((node) => (
          <g
            aria-label={node.id}
            key={node.id}
            onClick={onNodeClick === undefined ? undefined : () => activateNode(node.id)}
            onKeyDown={
              onNodeClick === undefined ? undefined : (event) => handleNodeKeyDown(event, node.id)
            }
            role={onNodeClick === undefined ? "img" : "button"}
            tabIndex={onNodeClick === undefined ? undefined : 0}
          >
            <circle cx={node.x} cy={node.y} r={6} />
          </g>
        ))}
      </g>
    </svg>
  );
};

export const ForceGraph3D = ({ layout }: ForceGraph3DProps) => {
  const projected: LayoutResult2D = {
    nodes: layout.nodes.map((node) => ({
      id: node.id,
      x: node.x + node.z * 0.25,
      y: node.y - node.z * 0.15,
    })),
    links: layout.links,
  };

  return <ForceGraph2D layout={projected} />;
};

export const Tree = ({ layout }: TreeProps) => {
  const positions = nodeMap2D(layout);

  return (
    <svg aria-label="Tree" role="img" viewBox={viewBox2D(layout)}>
      <g stroke="currentColor" strokeOpacity={0.4}>
        {layout.links.map((link, index) => {
          const source = positions.get(link.source);
          const target = positions.get(link.target);
          if (source === undefined || target === undefined) return null;
          return (
            <line
              key={`${link.source}->${link.target}:${index}`}
              x1={source.x}
              x2={target.x}
              y1={source.y}
              y2={target.y}
            />
          );
        })}
      </g>
      {layout.nodes.map((node) => (
        <g key={node.id}>
          <circle cx={node.x} cy={node.y} r={6} />
          <text dominantBaseline="middle" x={node.x + 10} y={node.y}>
            {node.id}
          </text>
        </g>
      ))}
    </svg>
  );
};
