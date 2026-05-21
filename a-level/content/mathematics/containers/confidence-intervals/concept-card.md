---
subject: mathematics
concept: confidence-intervals
branch: a-level
level: H2
syllabus_ref: 9758 / Probability and Statistics / 6.6 Confidence intervals
prerequisites:
  - normal-distribution
  - hypothesis-testing
aid_types:
  - simulation
  - misconception-audit
  - transfer-problem
status: reviewed
---

# Confidence Intervals

## First-Principles Explanation

A confidence interval estimates an unknown population parameter by keeping the sample estimate at the centre and adding a margin for sampling variation. For an A-Level sample mean interval with known population standard deviation, the centre is the sample mean and the spread comes from the standard error.

The first idea is that samples vary. Even when the true population mean is fixed, different random samples usually give different sample means. The standard error describes the typical movement of those sample means:

```text
SE = sigma / sqrt(n)
```

The standard error has the same units as the sample mean. If the data are measured in marks, the standard error, margin of error, and interval endpoints are also in marks. Increasing the sample size narrows the standard error because averaging more observations makes the sample mean less variable.

The confidence level chooses how much repeated-sampling variation the method tries to cover. For a two-sided normal mean interval, common A-Level multipliers are:

```text
90% confidence: z* = 1.645
95% confidence: z* = 1.960
99% confidence: z* = 2.576
```

The interval is then:

```text
sample mean +/- z* x SE
```

Higher confidence uses a larger multiplier, so it widens the interval when the sample mean, sigma, and sample size stay fixed. A larger sample size narrows the interval when the confidence level and sigma stay fixed.

The interpretation is the subtle part. Before data are collected, the interval-making method is random because the sample mean is random. In repeated sampling, about 95% of intervals constructed by the 95% method would contain the fixed true population mean. After one sample has been observed, the computed interval is fixed. The true mean is either inside it or outside it; it is not random under the usual frequentist reading.

That is why the safe wording is: "We are 95% confident that the population mean lies between these two endpoints," where "95% confident" refers to the long-run reliability of the method, not a posterior probability assigned to this particular parameter.

## Canonical Example

A cohort's sample mean mark is 68.0. The known population standard deviation is 9.0 marks and the sample size is 36. For a 95% confidence interval:

```text
SE = 9.0 / sqrt(36)
   = 1.50 marks

z* = 1.960

margin = 1.960 x 1.50
       = 2.94 marks

CI = 68.0 +/- 2.94
   = [65.06, 70.94] marks
```

A claimed population mean of 65.0 marks lies just outside this interval, while a claimed mean of 65.1 marks lies inside. The interval is centred on the sample mean; the claim is checked against the endpoints.

## Common Misconceptions

- **The interval gives the probability that the fixed parameter is inside.** The parameter is fixed after the model is chosen; the random object is the interval-making procedure before sampling.
- **Higher confidence makes the interval narrower.** Higher confidence needs a larger normal multiplier, so the interval widens unless the standard error also changes.
- **Wider intervals always mean worse data.** Width can increase because the learner asked for higher confidence, not because the sample was poor.
- **The margin of error is unitless.** It is a number of marks, minutes, units, or whatever units the sample mean uses.
