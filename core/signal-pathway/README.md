# @paideia/signal-pathway

Deterministic synchronous cascade propagation for Paideia simulations. A small
directed acyclic graph of nodes with activation / inhibition edges, a
saturating-response activation function, and topological propagation.

## Exports

- `SignalLevel`, `EdgeWeight`, `NodeId`, `EdgeEffect`
- `CascadeNode`, `CascadeEdge`, `CascadeGraph`, `PropagationResult`
- `signalLevel`, `edgeWeight`, `nodeId`, `sensitivity`
- `saturatingResponse`, `effectiveInput`, `propagate`

## Usage

```ts
import {
  edgeWeight,
  nodeId,
  propagate,
  signalLevel,
} from "@paideia/signal-pathway";

const result = propagate(
  {
    nodes: [
      { id: nodeId("ligand").value!,   basal: signalLevel(0).value!, threshold: signalLevel(0.1).value!, sensitivity: 8 },
      { id: nodeId("receptor").value!, basal: signalLevel(0).value!, threshold: signalLevel(0.5).value!, sensitivity: 8 },
      { id: nodeId("kinase").value!,   basal: signalLevel(0).value!, threshold: signalLevel(0.5).value!, sensitivity: 8 },
      { id: nodeId("tf").value!,       basal: signalLevel(0).value!, threshold: signalLevel(0.5).value!, sensitivity: 8 },
    ],
    edges: [
      { from: nodeId("ligand").value!,   to: nodeId("receptor").value!, effect: "activate", weight: edgeWeight(1).value! },
      { from: nodeId("receptor").value!, to: nodeId("kinase").value!,   effect: "activate", weight: edgeWeight(1).value! },
      { from: nodeId("kinase").value!,   to: nodeId("tf").value!,       effect: "activate", weight: edgeWeight(1).value! },
    ],
  },
  new Map([[nodeId("ligand").value!, signalLevel(1).value!]]),
);

if (result.ok) {
  for (const id of result.value.order) {
    console.log(id, result.value.outputs.get(id));
  }
}
```

## Scope

This module owns synchronous DAG propagation with a logistic activation
function. It deliberately does NOT integrate ODE-style time evolution
(compose with `core/dynamical-systems`), does NOT model stochastic events,
does NOT model ligand-binding kinetics, and does NOT parse pathway files.
