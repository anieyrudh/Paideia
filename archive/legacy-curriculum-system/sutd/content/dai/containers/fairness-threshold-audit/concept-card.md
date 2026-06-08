---
subject: dai
concept: fairness-threshold-audit
branch: sutd
level: Freshmore
syllabus_ref: SUTD DAI / Human-centred AI fairness evaluation
prerequisites:
  - confusion-matrix-thresholds
  - trust-calibration
  - probability
aid_types:
  - simulation
  - misconception-audit
  - transfer-problem
  - annotated-source
status: reviewed
---

# Fairness Threshold Audit

A fairness threshold audit asks whether a classifier threshold distributes errors
and stakeholder harm acceptably across groups. It does not begin with the
question "is the model accurate?" It begins with "who receives false positives,
who receives false negatives, and what does each error do to people?"

## First-Principles Explanation

A threshold converts a risk score into a decision. If a score is at or above the
threshold, the system predicts positive; otherwise it predicts negative. For
each group, this creates a confusion matrix:

- `TP`: actually positive and predicted positive.
- `FP`: actually negative but predicted positive.
- `TN`: actually negative and predicted negative.
- `FN`: actually positive but predicted negative.

Fairness auditing compares these cells group by group. A shared threshold can be
procedurally simple and still produce unequal effects because the groups may
have different score distributions or base rates.

The core recall calculation is:

```latex
Recall_g = \frac{TP_g}{TP_g + FN_g}
```

where `g` is the group. Recall is dimensionless and is usually reported as a
percentage. It matters when false negatives mean missed support, missed review,
or missed protection.

The stakeholder-harm calculation used in this container is:

```latex
Cost_g = FP_g \times C_{FP} + FN_g \times C_{FN}
```

`C_FP` and `C_FN` are policy-specific cost units. They do not claim that human
harm is perfectly measurable; they make the policy assumption visible so a team
can challenge it.

## Why It Matters

Human-centred AI decisions often have asymmetric consequences. In a student
support model, a false positive may send a student through an unnecessary
review, while a false negative may miss someone who needed help. In hiring, a
false positive may consume interviewer time, while a false negative may exclude
someone qualified. In moderation, a false positive may silence speech, while a
false negative may leave harmful content online.

A fairness threshold audit keeps the design conversation grounded in evidence:
group-level counts, error rates, and named stakeholder harms. It also creates a
record of why a team chose a global threshold, a group-specific threshold, or a
non-threshold intervention such as better data collection.

## Canonical Example

Two student groups are scored by the same model. At a 70% threshold:

- Group A has `TP=3`, `FP=2`, `TN=3`, `FN=2`.
- Group B has `TP=1`, `FP=2`, `TN=3`, `FN=4`.

If false negatives cost 25 support-harm units and false positives cost 6
review-burden units, then:

```latex
Cost_A = 2(6) + 2(25) = 62\ \text{cost units}
```

```latex
Cost_B = 2(6) + 4(25) = 112\ \text{cost units}
```

The accuracy for the two groups can look close, but the recall gap is:

```latex
\left|\frac{3}{3+2} - \frac{1}{1+4}\right|
= |0.60 - 0.20|
= 0.40
```

Interpretation: the shared threshold misses a much larger share of actually
positive Group B cases, so the audit should continue before deployment.

## Common Misconceptions

**Equal accuracy means equal impact.** Accuracy combines true positives and true
negatives. If the design risk is missed support, recall and false-negative cost
may be more relevant than accuracy.

**One global threshold is always fairest.** A single threshold can be easier to
explain, but fairness depends on group error patterns and stakeholder harm, not
only whether a rule is identical.

**Group-specific thresholds automatically solve fairness.** Adjusting a
threshold can reduce one gap while increasing another burden. The audit must
show what changed and why the change is justified.

## Transfer

Use the same audit structure for hiring shortlists, loan review, medical triage,
content moderation, or any setting where groups may experience different error
patterns. The surface story changes; the evidence loop stays the same:
compute group confusion matrices, substitute counts into the formulas, compare
gaps, and explain the stakeholder tradeoff.
