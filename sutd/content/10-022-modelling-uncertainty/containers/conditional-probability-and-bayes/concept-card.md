---
subject: 10-022-modelling-uncertainty
concept: conditional-probability-and-bayes
branch: sutd
level: "10.022"
syllabus_ref: "SUTD 10.022 / Probability and Statistics"
prerequisites:
  - basic-probability
  - conditional-probability
aid_types:
  - simulation
status: reviewed
---

# Conditional Probability and Bayes

## First-principles explanation

Conditional probability and Bayes asks: after seeing evidence, how much of the evidence came from
real cases rather than false alarms? A positive result can happen in two ways:
the hypothesis is true and the test catches it, or the hypothesis is false and
the test produces a false positive. The posterior probability is the true-case
route divided by all positive-result routes.

```latex
P(H \mid +) =
\frac{P(+ \mid H)P(H)}
{P(+ \mid H)P(H) + P(+ \mid \neg H)P(\neg H)}
```

## Key definitions

- **Prior probability P(H):** belief before the new evidence.
- **Sensitivity P(+|H):** probability of a positive result when the hypothesis is true.
- **Specificity P(-|not H):** probability of a negative result when the hypothesis is false.
- **False-positive rate P(+|not H):** `1 - specificity`.
- **Posterior probability P(H|+):** belief after a positive result.

## Why this matters

Conditional probability and Bayes protects learners from reading evidence backwards. A test can be
very sensitive and still produce a moderate posterior when the underlying event
is rare, because false positives can outnumber true positives.

## Canonical examples

- Medical screening for a rare condition.
- Fault detection in a machine that rarely fails.
- Spam detection when genuine messages are much more common than spam.

## Common misconceptions

- Treating P(+|H) as if it were P(H|+).
- Ignoring the base rate because the test sounds accurate.
- Forgetting that false positives contribute to the pool of positive results.

## What the student does

The student predicts the posterior for a default case, adjusts prior prevalence,
sensitivity, and specificity, then reveals the formula, substitution, and
interpretation.
