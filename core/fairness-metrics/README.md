# @paideia/fairness-metrics

Deterministic fairness-audit helpers for binary classification simulations.

Use this package when a container needs shared per-group confusion counts,
selection rates, TPR/FPR/FNR/TNR, demographic parity gaps, equal opportunity
gaps, equalized odds gaps, or threshold-sweep evidence over existing scores.

```ts
import { groupAuditReport, groupName } from "@paideia/fairness-metrics";

const groupA = groupName("A");
const groupB = groupName("B");

if (groupA.ok && groupB.ok) {
  const report = groupAuditReport([
    { id: "1", group: groupA.value, actualPositive: true, predictedPositive: true },
    { id: "2", group: groupB.value, actualPositive: true, predictedPositive: false },
  ]);
}
```

## Scope

This package computes audit evidence only. It does not choose policy,
optimise thresholds, train classifiers, load datasets, or render charts.
