---
subject: mathematics
concept: normal-distribution
branch: a-level
level: H2
syllabus_ref: "9758 / Probability and Statistics / 6.4 Normal distribution"
prerequisites:
  - probability-statistics
  - functions-and-graphs
aid_types:
  - concept-card
  - simulation
  - misconception-audit
  - transfer-problem
status: reviewed
---

# Normal Distribution

## First-Principles Explanation

A normal distribution is a continuous probability model for a variable whose values cluster symmetrically around a mean. If \(X \sim N(\mu,\sigma^2)\), then \(\mu\) is the centre in the same unit as \(X\), and \(\sigma\) is the standard deviation in the same unit. Probabilities are not heights of the curve; they are areas under the curve over intervals or tails.

The useful move is standardisation. Instead of memorising a different curve for every mean and standard deviation, convert a raw value \(x\) to

```text
z = (x - mu) / sigma
```

The result \(z\) is unitless and tells how many standard deviations \(x\) is from the mean. Once every raw boundary has been converted to the standard normal scale, a standard normal table, calculator, or numerical CDF gives the area.

For example, if \(X \sim N(100,12^2)\), the interval from 88 to 112 marks becomes \(z=-1\) to \(z=1\). The probability is the central area between those z-values, about 0.683. That means about 68.3% of observations from this model fall in that raw mark interval.

## Why It Matters

Normal models connect raw measurements to probability statements. They are used in A-Level questions about scores, measurements, errors, biological variation, manufacturing tolerances, and later inference. The same standardisation move also underpins normal approximations, hypothesis testing, and confidence intervals.

## Canonical Example

Let \(X \sim N(72,9^2)\), where \(X\) is an exam mark.

To find \(P(65 < X < 80)\):

```text
z_lower = (65 - 72) / 9 = -0.778
z_upper = (80 - 72) / 9 = 0.889
P(65 < X < 80) = Phi(0.889) - Phi(-0.778)
```

The answer is an area, not a z-score. A complete answer names the model, shows both substitutions with units cancelled, reads the standard normal area, and interprets the result in the original context.

## Common Misconceptions

- A z-score is not a probability. It is a standardised location.
- Symmetry only gives equal areas for regions that mirror each other about the mean on the same scale.
- \(\sigma\) has the same unit as the raw variable; \(\sigma^2\) is the variance.
- A higher point on the curve does not mean a single exact value has non-zero probability. For a continuous variable, probability belongs to an interval or tail.

## Transfer

When a question changes from exam marks to battery life or component diameter, the procedure is unchanged: identify \(\mu\), identify \(\sigma\), choose the raw boundary or interval, standardise, read the standard normal area, and translate the probability back into the context.
