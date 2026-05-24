# @paideia/argument-graph

Pure helpers for claim-evidence-rebuttal graphs.

This package validates argument graph structure, builds deterministic adjacency,
detects cycles, returns DAG order when possible, extracts local neighborhoods,
and summarizes incoming support/attack/qualification relations. It does not
judge truth, fetch sources, render diagrams, or call AI.

## Example

```ts
import {
  argumentBalance,
  argumentNodeId,
  argumentRelationId,
  validateArgumentGraph,
} from "@paideia/argument-graph";

const claim = argumentNodeId("claim");
const evidence = argumentNodeId("evidence");
const support = argumentRelationId("support");

if (claim.ok && evidence.ok && support.ok) {
  const graph = {
    nodes: [
      { id: claim.value, kind: "claim", label: "The design is stable." },
      { id: evidence.value, kind: "evidence", label: "The test data stays bounded." },
    ],
    relations: [
      { id: support.value, kind: "supports", from: evidence.value, to: claim.value, weight: 0.8 },
    ],
  } as const;

  const valid = validateArgumentGraph(graph);
  const balance = valid.ok ? argumentBalance(valid.value, claim.value) : valid;

  // balance.value.netSupport is 0.8 when ok.
}
```

## Conventions

- Relations point from the reason to the thing being reasoned about.
- `supports` and `attacks` affect `netSupport`; `qualifies` and `depends-on`
  are counted but do not decide truth.
- Cycles are reported, not erased.
- Consumers render diagrams with `core/graph-layout` or app-level components.
