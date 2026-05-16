# @paideia/mind-map

Mind-map parsing, serialization, rendering, and small editor controls for
hierarchical concept trees. Consumers pass either markmap-flavoured markdown,
Mermaid `mindmap` syntax, or a typed `MindMapNode` tree.

```tsx
import { Markmap, serializeMarkmap } from "@paideia/mind-map";

const source = serializeMarkmap({
  id: "forces",
  label: "Forces",
  children: [{ id: "newton-2", label: "Newton's second law" }],
});

export function Overview() {
  return <Markmap source={source} />;
}
```

The parser rejects duplicate ids and exactly one root is required. The renderer
displays the data tree it receives; collapsed nodes remain present in the model
and only hide their descendants visually.
