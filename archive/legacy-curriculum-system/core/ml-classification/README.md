# @paideia/ml-classification

Deterministic introductory binary-classification helpers for Paideia
containers. The package covers transparent linear scores, sigmoid
probabilities, logistic loss, thresholded confusion counts, a single
perceptron update step, and linear-separator margin calculations.

```ts
import {
  binaryLogisticLoss,
  confusionCountsFromScores,
  linearScore,
  sigmoidProbability,
} from "@paideia/ml-classification";

const score = linearScore({ weights: [2, -1], features: [3, 4], bias: 0.5 });

if (score.ok) {
  const probability = sigmoidProbability(score.value);
  const loss = binaryLogisticLoss({ score: score.value, label: 1 });
}

const counts = confusionCountsFromScores({
  examples: [
    { score: 0.8, label: 1 },
    { score: 0.2, label: 1 },
    { score: 0.6, label: 0 },
    { score: 0.1, label: 0 },
  ],
  threshold: 0.5,
});
```

The kernel does not train models, choose thresholds, initialise weights,
render UI, fetch datasets, or contain branch-specific presets.
