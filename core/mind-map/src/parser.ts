import { err, ok, type KernelResult } from "@paideia/shared";
import type { MindMapNode } from "./types.js";
import { validateMindMap } from "./tree.js";

interface DraftNode {
  readonly id: string;
  readonly label: string;
  readonly note?: string;
  readonly collapsed?: boolean;
  readonly children: DraftNode[];
}

interface ParsedLine {
  readonly depth: number;
  readonly text: string;
}

const idPattern = /\s+\{#([A-Za-z0-9_.:-]+)\}\s*$/u;
const metaPattern = /\s+<!--\s*paideia:([^>]*)-->\s*$/u;

const slug = (value: string): string => {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-|-$/gu, "");
  return normalized.length > 0 ? normalized : "node";
};

const stableId = (label: string, path: readonly number[]): string =>
  `${slug(label)}-${path.join("-")}`;

const decodeMeta = (
  text: string,
): { readonly text: string; readonly note?: string; readonly collapsed?: boolean } => {
  const metaMatch = text.match(metaPattern);
  if (metaMatch === null) return { text };
  const rawMeta = (metaMatch[1] ?? "").trim();
  const baseText = text.slice(0, metaMatch.index).trimEnd();
  const params = new URLSearchParams(rawMeta.replaceAll(";", "&"));
  const note = params.get("note");
  const collapsed = params.get("collapsed");
  return {
    text: baseText,
    ...(note !== null && { note }),
    ...(collapsed !== null && { collapsed: collapsed === "true" }),
  };
};

const encodeMeta = (node: MindMapNode): string => {
  const params = new URLSearchParams();
  if (node.note !== undefined) params.set("note", node.note);
  if (node.collapsed !== undefined) params.set("collapsed", String(node.collapsed));
  const encoded = params.toString();
  return encoded.length > 0 ? ` <!-- paideia:${encoded.replaceAll("&", ";")} -->` : "";
};

const stripShape = (value: string): string => {
  const trimmed = value.trim();
  const mermaidRoot = trimmed.match(/^root\(\((.*)\)\)$/u);
  if (mermaidRoot?.[1] !== undefined) {
    return mermaidRoot[1].trim();
  }

  const wrappers: readonly (readonly [string, string])[] = [
    ["((", "))"],
    ["{{", "}}"],
    ["[", "]"],
    ["(", ")"],
  ];
  for (const [open, close] of wrappers) {
    if (trimmed.startsWith(open) && trimmed.endsWith(close)) {
      return trimmed.slice(open.length, -close.length).trim();
    }
  }
  return trimmed;
};

const materialize = (draft: DraftNode): MindMapNode => ({
  id: draft.id,
  label: draft.label,
  ...(draft.note !== undefined && { note: draft.note }),
  ...(draft.collapsed !== undefined && { collapsed: draft.collapsed }),
  ...(draft.children.length > 0 && {
    children: draft.children.map((child) => materialize(child)),
  }),
});

const parseItem = (raw: string, path: readonly number[]): DraftNode => {
  const decoded = decodeMeta(raw.trim());
  const idMatch = decoded.text.match(idPattern);
  const withoutId =
    idMatch === null ? decoded.text : decoded.text.slice(0, idMatch.index).trimEnd();
  const label = stripShape(withoutId);
  return {
    id: idMatch?.[1] ?? stableId(label, path),
    label,
    ...(decoded.note !== undefined && { note: decoded.note }),
    ...(decoded.collapsed !== undefined && { collapsed: decoded.collapsed }),
    children: [],
  };
};

const buildTree = (lines: readonly ParsedLine[]): KernelResult<MindMapNode> => {
  if (lines.length === 0) {
    return err("precondition-violated", "Mind-map source must contain at least one node");
  }

  const roots: DraftNode[] = [];
  const stack: { readonly depth: number; readonly node: DraftNode; childCount: number }[] = [];

  for (const line of lines) {
    while (stack.length > 0 && (stack[stack.length - 1]?.depth ?? 0) >= line.depth) {
      stack.pop();
    }

    const parent = stack[stack.length - 1];
    const siblings = parent === undefined ? roots : parent.node.children;
    const path =
      parent === undefined
        ? [siblings.length]
        : [...stack.map((entry) => entry.childCount), siblings.length];
    const draft = parseItem(line.text, path);
    siblings.push(draft);
    if (parent !== undefined) parent.childCount += 1;
    stack.push({ depth: line.depth, node: draft, childCount: 0 });
  }

  if (roots.length !== 1) {
    return err("precondition-violated", "Mind-map source must declare exactly one root node");
  }

  const root = roots[0];
  if (root === undefined) {
    return err("precondition-violated", "Mind-map source must declare a root node");
  }

  const materialized = materialize(root);
  const valid = validateMindMap(materialized);
  return valid.ok ? ok(materialized) : valid;
};

export const parseMarkmap = (source: string): KernelResult<MindMapNode> => {
  const lines: ParsedLine[] = [];

  for (const rawLine of source.split(/\r?\n/u)) {
    if (rawLine.trim() === "") continue;
    const heading = rawLine.match(/^(#{1,6})\s+(.+)$/u);
    if (heading !== null) {
      lines.push({ depth: heading[1]?.length ?? 1, text: heading[2] ?? "" });
      continue;
    }

    const bullet = rawLine.match(/^(\s*)([-*+])\s+(.+)$/u);
    if (bullet !== null) {
      lines.push({
        depth: Math.floor((bullet[1]?.replace(/\t/gu, "  ").length ?? 0) / 2),
        text: bullet[3] ?? "",
      });
    }
  }

  const normalized =
    lines.length === 0 ? lines : lines.map((line) => ({ ...line, depth: line.depth - lines[0]!.depth }));
  return buildTree(normalized);
};

export const parseMermaidMindmap = (source: string): KernelResult<MindMapNode> => {
  const lines = source
    .split(/\r?\n/u)
    .filter((line) => line.trim() !== "" && line.trim() !== "mindmap")
    .map((line) => ({
      depth: Math.floor((line.match(/^\s*/u)?.[0].replace(/\t/gu, "  ").length ?? 0) / 2),
      text: line.trim().replace(/^[-*+]\s+/u, ""),
    }));

  const normalized =
    lines.length === 0 ? lines : lines.map((line) => ({ ...line, depth: line.depth - lines[0]!.depth }));
  return buildTree(normalized);
};

const serializeNode = (node: MindMapNode, depth: number): readonly string[] => {
  const indent = "  ".repeat(depth);
  const line = `${indent}- ${node.label} {#${node.id}}${encodeMeta(node)}`;
  return [line, ...(node.children ?? []).flatMap((child) => serializeNode(child, depth + 1))];
};

export const serializeMarkmap = (root: MindMapNode): string => {
  const valid = validateMindMap(root);
  if (!valid.ok) {
    return "";
  }

  return `${serializeNode(root, 0).join("\n")}\n`;
};
