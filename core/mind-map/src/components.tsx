import { useMemo } from "react";
import { parseMarkmap, parseMermaidMindmap } from "./parser.js";
import type { MindMapNode } from "./types.js";

export interface MarkmapProps {
  readonly source: string;
  readonly format?: "markmap" | "mermaid";
  readonly onNodeClick?: (id: string) => void;
}

export interface MindMapProps {
  readonly root: MindMapNode;
  readonly onNodeClick?: (id: string) => void;
}

const NodeView = ({
  node,
  depth,
  onNodeClick,
}: {
  readonly node: MindMapNode;
  readonly depth: number;
  readonly onNodeClick?: (id: string) => void;
}) => (
  <li data-depth={depth}>
    <button
      aria-label={node.label}
      onClick={onNodeClick === undefined ? undefined : () => onNodeClick(node.id)}
      type="button"
    >
      {node.label}
    </button>
    {node.note === undefined ? null : <p>{node.note}</p>}
    {node.collapsed === true || (node.children ?? []).length === 0 ? null : (
      <ul>
        {(node.children ?? []).map((child) => (
          <NodeView
            depth={depth + 1}
            key={child.id}
            node={child}
            {...(onNodeClick === undefined ? {} : { onNodeClick })}
          />
        ))}
      </ul>
    )}
  </li>
);

export const MindMap = ({ root, onNodeClick }: MindMapProps) => (
  <nav aria-label="Mind map">
    <ul>
      <NodeView
        depth={0}
        node={root}
        {...(onNodeClick === undefined ? {} : { onNodeClick })}
      />
    </ul>
  </nav>
);

export const Markmap = ({ source, format = "markmap", onNodeClick }: MarkmapProps) => {
  const parsed = useMemo(
    () => (format === "mermaid" ? parseMermaidMindmap(source) : parseMarkmap(source)),
    [format, source],
  );

  if (!parsed.ok) {
    return <p role="alert">{parsed.error.message}</p>;
  }

  return (
    <MindMap
      root={parsed.value}
      {...(onNodeClick === undefined ? {} : { onNodeClick })}
    />
  );
};
