# Transfer Problem: Hiring Shortlist Audit

A hiring shortlist model screens two applicant groups.

At the current threshold:

| Group | TP | FP | TN | FN |
| --- | ---: | ---: | ---: | ---: |
| A | 18 | 6 | 28 | 8 |
| B | 10 | 5 | 29 | 16 |

False negatives cost 30 stakeholder-harm units because a qualified applicant is
missed. False positives cost 8 review-burden units because an unqualified
application enters manual review.

## Task

1. Compute recall for each group.
2. Compute weighted harm for each group.
3. Compute the recall gap and weighted harm gap.
4. Decide whether the current threshold should stay, be adjusted, or be sent
   back for model/data review.

## Worked Substitution

```latex
Recall_A = \frac{18}{18 + 8} = 69.2\%
```

```latex
Recall_B = \frac{10}{10 + 16} = 38.5\%
```

```latex
Cost_A = 6(8) + 8(30) = 288\ \text{cost units}
```

```latex
Cost_B = 5(8) + 16(30) = 520\ \text{cost units}
```

```latex
RecallGap = |69.2\% - 38.5\%| = 30.7\ \text{percentage points}
```

```latex
HarmGap = |288 - 520| = 232\ \text{cost units}
```

## Rubric

- Full credit: computes both recalls and both costs correctly, states the units,
  names Group B's false-negative burden, and proposes a justified policy change
  or deployment hold.
- Partial credit: computes the metrics correctly but gives a policy answer that
  does not name stakeholder harm.
- Retry: uses accuracy alone or pools the two groups before computing the audit.
