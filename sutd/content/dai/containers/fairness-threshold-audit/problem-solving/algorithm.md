# Problem-Solving Algorithm

Use this procedure whenever a threshold policy must be audited across groups.

1. Name the decision and groups.
   - Define what counts as actual positive and predicted positive.
   - Confirm that each group's examples use the same label definition.

2. Build a confusion matrix for each group.
   - Count `TP_g`, `FP_g`, `TN_g`, and `FN_g`.
   - Keep group counts separate; do not pool them before the audit.

3. Compute recall for each group.

```latex
Recall_g = \frac{TP_g}{TP_g + FN_g}
```

Substitute counts and report recall as a percentage. Recall has no unit.

4. Compute weighted stakeholder harm for each group.

```latex
Cost_g = FP_g \times C_{FP} + FN_g \times C_{FN}
```

Substitute counts and error costs. Report the result in cost units.

5. Compare gaps.

```latex
RecallGap = |Recall_A - Recall_B|
```

```latex
HarmGap = |Cost_A - Cost_B|
```

Recall gap is measured in percentage points. Harm gap is measured in cost
units.

6. Interpret before choosing a policy.
   - If recall gap or harm gap is large, identify which group and error cell
     creates the concern.
   - If a threshold adjustment reduces one gap, check whether it increases
     false positives or another stakeholder burden.
   - If the tradeoff cannot be justified, recommend more data, a changed model,
     a human review rule, or delayed deployment.

7. Write the decision.
   - State the selected threshold policy.
   - Name the evidence that supports it.
   - Name the harm that remains and how it will be monitored.
