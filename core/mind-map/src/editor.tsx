import { useState } from "react";
import type { MindMapNode } from "./types.js";
import { cloneNode, containsId, findNode, mapNode, removeNode } from "./tree.js";

export interface MindMapEditorProps {
  readonly initial: MindMapNode;
  readonly onChange: (root: MindMapNode) => void;
}

const nextChildId = (root: MindMapNode, parent: MindMapNode): string => {
  let suffix = (parent.children ?? []).length + 1;
  let id = `${parent.id}-child-${suffix}`;
  while (containsId(root, id)) {
    suffix += 1;
    id = `${parent.id}-child-${suffix}`;
  }
  return id;
};

export const MindMapEditor = ({ initial, onChange }: MindMapEditorProps) => {
  const [root, setRoot] = useState<MindMapNode>(() => cloneNode(initial));
  const [selectedId, setSelectedId] = useState(initial.id);
  const selected = findNode(root, selectedId) ?? root;

  const publish = (next: MindMapNode) => {
    setRoot(next);
    onChange(next);
  };

  const renameSelected = (label: string) => {
    publish(mapNode(root, selected.id, (node) => ({ ...node, label })));
  };

  const addChild = () => {
    const child: MindMapNode = { id: nextChildId(root, selected), label: "New node" };
    const next = mapNode(root, selected.id, (node) => ({
      ...node,
      children: [...(node.children ?? []), child],
    }));
    setSelectedId(child.id);
    publish(next);
  };

  const removeSelected = () => {
    if (selected.id === root.id) return;
    const next = removeNode(root, selected.id);
    setSelectedId(root.id);
    publish(next);
  };

  const reparentSelected = (parentId: string) => {
    if (selected.id === root.id || parentId === selected.id || containsId(selected, parentId)) {
      return;
    }
    const moving = cloneNode(selected);
    const without = removeNode(root, selected.id);
    const next = mapNode(without, parentId, (node) => ({
      ...node,
      children: [...(node.children ?? []), moving],
    }));
    publish(next);
  };

  const ids: string[] = [];
  const collectIds = (node: MindMapNode): void => {
    ids.push(node.id);
    (node.children ?? []).forEach(collectIds);
  };
  collectIds(root);

  return (
    <section aria-label="Mind map editor">
      <label>
        Node
        <select onChange={(event) => setSelectedId(event.currentTarget.value)} value={selected.id}>
          {ids.map((id) => (
            <option key={id} value={id}>
              {id}
            </option>
          ))}
        </select>
      </label>
      <label>
        Label
        <input
          onChange={(event) => renameSelected(event.currentTarget.value)}
          value={selected.label}
        />
      </label>
      <label>
        Parent
        <select
          onChange={(event) => reparentSelected(event.currentTarget.value)}
          value=""
        >
          <option value="">Move to...</option>
          {ids
            .filter((id) => id !== selected.id)
            .map((id) => (
              <option key={id} value={id}>
                {id}
              </option>
            ))}
        </select>
      </label>
      <button onClick={addChild} type="button">
        Add child
      </button>
      <button disabled={selected.id === root.id} onClick={removeSelected} type="button">
        Remove
      </button>
    </section>
  );
};
