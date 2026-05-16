# @paideia/annotation

Span and region annotation helpers for close-reading and source-evaluation
activities. The package owns the annotation data shape, minimal React
components, and a stable markdown marker format.

```tsx
import { AnnotatableText } from "@paideia/annotation";

export function SourceMarkup() {
  return (
    <AnnotatableText
      annotations={[]}
      tags={[{ id: "claim", label: "Claim", colour: "#fde68a" }]}
      text="The source makes a claim here."
    />
  );
}
```

Annotations are overlays only. The package does not classify text, persist to a
server, or create subject-specific tag sets.
