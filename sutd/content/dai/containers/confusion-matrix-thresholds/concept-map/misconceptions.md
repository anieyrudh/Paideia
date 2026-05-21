# Misconception Coverage

## Accuracy is enough for every deployment

**Evidence**: Thresholding references from Google ML Crash Course and the scikit-learn model-evaluation guide separate confusion-matrix cells from aggregate accuracy. Suresh and Guttag (2021) connects model errors to downstream stakeholder harms.

**Surface in predict?** Yes. The prediction asks learners to reason about recall and missed-positive cost before the count table is revealed.

**How this container counters it**: The simulation places accuracy beside precision, recall, FP/FN counts, and cost units. Learners must justify the threshold with error-cell consequences rather than a single score.

## A single threshold is neutral for all groups

**Evidence**: Hardt, Price, and Srebro (2016) show that error patterns can differ across groups under supervised learning decisions. Suresh and Guttag (2021) describes how deployment choices can shift harms across stakeholders.

**Surface in predict?** Yes. The package-level misconception graph and transfer prompt ask learners to question whether the same threshold would preserve the same error pattern across contexts.

**How this container counters it**: The transfer stage asks learners to compare error patterns and stakeholder costs before accepting a shared policy threshold.
