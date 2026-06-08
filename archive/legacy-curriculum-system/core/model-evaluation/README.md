# @paideia/model-evaluation

Pure model-evaluation helpers for containers that need multi-class confusion
matrices, per-label precision/recall/F1, aggregate summaries, or calibration
buckets.

Use this package after a model has already produced labels or confidence scores.
It does not train models, choose thresholds, render charts, or define fairness
policy. Binary threshold-cost evidence stays in `@paideia/probability-stats`.

## Example

```ts
import {
  confusionMatrix,
  labelName,
  perLabelMetrics,
} from "@paideia/model-evaluation";

const cat = labelName("cat");
const dog = labelName("dog");

if (!cat.ok || !dog.ok) throw new Error("invalid labels");

const matrix = confusionMatrix([
  { id: "case-1", actual: cat.value, predicted: cat.value },
  { id: "case-2", actual: cat.value, predicted: dog.value },
  { id: "case-3", actual: dog.value, predicted: dog.value },
]);

if (matrix.ok) {
  const catEvidence = perLabelMetrics(matrix.value, cat.value);
  if (catEvidence.ok) {
    console.log(catEvidence.value.precision);
  }
}
```

## Metric conventions

- All metric values are unit intervals, not percentages.
- Precision, recall, and F1 return `0` when their denominator is zero.
- `macroF1` is the unweighted mean across labels.
- `weightedF1` weights each label by support.
- `microF1` is computed from summed true positives, false positives, and false
  negatives.
- Calibration buckets split `[0, 1]` into equal-width score intervals. Empty
  buckets keep finite midpoint evidence and do not contribute to expected
  calibration error.
