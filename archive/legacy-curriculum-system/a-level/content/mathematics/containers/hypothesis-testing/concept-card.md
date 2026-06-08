---
subject: mathematics
concept: hypothesis-testing
branch: a-level
level: H2
syllabus_ref: 9758 / Probability and Statistics / 6.5 Hypothesis testing
prerequisites:
  - probability-statistics
  - normal-distribution
aid_types:
  - simulation
  - misconception-audit
  - transfer-problem
status: reviewed
---

# Hypothesis Testing

## First-Principles Explanation

Hypothesis testing is a disciplined way to decide whether sample evidence is unusual under a stated null model. It starts by naming the population claim, not by looking for any difference in the sample.

Imagine placing the null claim at the centre of a number line. Ordinary samples land near that centre because sampling noise can push the sample mean a little above or below the true population mean. The critical region is the far tail: a place the sample mean should rarely reach if the null claim is right. The test statistic measures how many standard errors the sample mean has travelled from the centre.

This is why a hypothesis test is not just a comparison of two means. A difference of 3 marks may be ordinary in a noisy small sample, but unusual in a large or low-spread sample. The reasoning is visual first: centre the null model, measure the sampling spread, then ask whether the observed result is in the tail chosen by the alternative hypothesis.

For a sample mean test with known population standard deviation, the null model is usually \(H_0: \mu = \mu_0\). The alternative \(H_1\) names the direction of evidence: \(\mu > \mu_0\), \(\mu < \mu_0\), or \(\mu \ne \mu_0\). Once the hypotheses are fixed, the sample mean is standardised:

```text
SE = sigma / sqrt(n)
z = (xbar - mu0) / SE
```

The standard error is measured in the same units as the sample mean. A larger sample size makes the standard error smaller, so the same observed gap can become stronger evidence when \(n\) grows.

The critical region is the pre-agreed rule. At the 5% level for a greater-than test, for example, a z-statistic at or beyond 1.645 is in the rejection region. For a two-sided 5% test, the usual boundary is \(|z| \ge 1.960\).

The p-value is not the probability that \(H_0\) is true. It is the probability, assuming \(H_0\), of a test statistic at least as extreme as the observed one in the direction requested by \(H_1\). If the p-value is below the significance level, the sample result would be rare enough under \(H_0\) to reject \(H_0\). Rejection supports the alternative as a decision, not as proof.

## Canonical Example

A paper is marked out of 100. The historical mean is 64 marks and the known population standard deviation is 8 marks. A sample of 36 scripts has mean 67.2 marks.

```text
H0: mu = 64
H1: mu > 64
SE = 8 / sqrt(36) = 1.33 marks
z = (67.2 - 64) / 1.33 = 2.40
```

At the 5% significance level for a greater-than test, the critical region is \(z \ge 1.645\). Since 2.40 is in that region, the result supports rejecting \(H_0\). A safe interpretation is: if the true mean were still 64 marks, a sample mean this high would be unusual at the 5% level.

## Common Misconceptions

- **p-value is the probability the null hypothesis is true.** It is conditional on \(H_0\); it does not assign a probability to \(H_0\).
- **Rejecting \(H_0\) proves \(H_1\).** The conclusion is a decision under assumptions and a significance level, not mathematical proof of the alternative.
- **Only the observed difference matters.** The sample size and standard deviation determine the standard error, so the same gap can have different evidential strength.
