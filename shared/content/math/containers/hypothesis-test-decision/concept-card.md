---
subject: math
concept: hypothesis-test-decision
branch: shared
level: Shared core
syllabus_ref: Shared mathematics / Inference / One-sample hypothesis tests
prerequisites:
  - probability-distributions
  - central-limit-theorem
aid_types:
  - simulation
  - misconception-audit
  - transfer-problem
status: reviewed
---

# Hypothesis Test Decision Lab

A hypothesis test asks whether sample evidence is too unusual under a null model. The null hypothesis states the baseline claim, such as "the process mean is 50." The alternative hypothesis states the direction of evidence being looked for: greater than, less than, or different from the null mean.

For a normal mean test with known population standard deviation, the sample mean is converted into a z statistic:

```latex
z = \frac{\bar{x} - \mu_0}{\sigma / \sqrt{n}}
```

The denominator is the standard error. It measures how much sample means usually move around when the null hypothesis is true. A sample mean that is only slightly above the null may be ordinary when the standard error is large, but unusual when the standard error is small.

The decision rule compares the z statistic with the critical boundary set by alpha. For an upper-tail test, reject the null when z is large enough. For a lower-tail test, reject when z is negative enough. For a two-sided test, reject when the absolute value of z is large enough in either direction.

The p-value language says the same idea from the tail-area side: assuming the null model is true, how extreme is evidence at least as far from the null as the sample result? A small p-value is evidence against the null model. It is not the probability that the null hypothesis is true.

## Why This Matters

Statistical decisions sit between data and action. A lab, production line, or classroom study can see a sample difference by chance. Hypothesis testing prevents the decision from being based only on whether the sample mean is above or below the claim.

The decision still needs interpretation. Rejecting the null means "this sample is unlikely enough under the null model at the chosen alpha." It does not prove practical importance, causal importance, or certainty. Not rejecting the null means "the evidence did not cross the chosen threshold." It does not prove the null is true.

## Canonical Example

A process is claimed to average 50 units. A sample of 36 observations has mean 52.1, with known population standard deviation 6.0. For an upper-tail test at alpha 0.05:

```latex
z = \frac{52.1 - 50.0}{6.0 / \sqrt{36}} = 2.10
```

The 5% upper-tail critical boundary is 1.645. Because 2.10 is in the rejection region, the test rejects the null and concludes there is statistically significant evidence that the mean is greater than 50.

If the observed mean were 51.3 instead, the z statistic would be 1.30. That is above the null mean, but not far enough above it to reject at 5%.

## Common Misconceptions

- **"The p-value is the probability the null is true."** The p-value is calculated under the assumption that the null model is true.
- **"Statistical significance is practical importance."** A statistically significant effect may still be too small to matter in the real setting.
- **"Any movement in the alternative direction rejects."** Direction is not enough. The distance must be judged relative to standard error and alpha.

## Transfer

The same decision logic works for quality control, A/B testing, clinical measurements, and any setting where a sample statistic is compared with a baseline model. The context changes; the structure remains null, alternative, statistic, threshold, decision, and interpretation.
