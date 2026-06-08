---
subject: math
concept: bayes-updating
branch: shared
level: "Shared core"
syllabus_ref: "Shared mathematics / Probability / Conditional probability and Bayes theorem"
prerequisites:
  - basic-probability
  - conditional-probability
aid_types:
  - simulation
status: reviewed
---

# Bayes Theorem Visualiser

## First-principles explanation

Bayes updating asks: after seeing evidence, how much of the evidence came from
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

Bayes updating protects learners from reading evidence backwards. A test can be
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

## Pedagogical choices and why

- **Predict format:** multiple choice, because the options separate sensitivity,
  prior-only thinking, and the normalized posterior.
- **Manipulate variables:** prior probability, sensitivity, and specificity are
  the smallest reusable input set for screening, sensor, and classifier examples.
- **Observe representation:** the route chart makes the denominator visible as
  true positives plus false positives before the formula is interpreted.
- **Transfer problem:** a rare-fault sensor keeps the same update structure while
  moving away from medical-screening examples.

## Misconceptions this surfaces

- **Positive evidence means high probability** — the reveal shows that a low
  prior can keep the posterior moderate.
- **Sensitivity alone determines posterior** — the formula requires the
  false-positive route and the complement of the prior.
- **False positives can be ignored** — the route chart shows how a large
  non-hypothesis population can still contribute positive evidence.

## Notes for the teacher

Ask students to name both routes to a positive result before they calculate.
That naming step is the guardrail against reading P(+|H) backwards as P(H|+).
