---
subject: math
concept: central-limit-theorem
branch: shared
level: Shared core
syllabus_ref: Shared probability and statistics / Sampling distributions
prerequisites:
  - random-variables
  - mean-and-variance
aid_types:
  - simulation
  - misconception-audit
  - transfer-problem
status: reviewed
---

# Central Limit Theorem

## First-Principles Explanation

The central limit theorem is about the distribution of averages, not about changing the original population. Take many independent samples of the same size from one population, compute each sample mean, and plot those means. As the sample size grows, that sampling distribution stays centred at the population mean and becomes less spread out; for many populations it also becomes close enough to a normal shape to support estimation and testing.

## Key Definitions

- **Population distribution:** the pattern of individual observations before sampling.
- **Sample mean:** the average of one sample, written as x-bar.
- **Sampling distribution of the mean:** the distribution made by repeating the sampling process and recording one mean per sample.
- **Standard error:** the standard deviation of the sample mean, sigma divided by sqrt(n), measured in the same units as the observations.

## Canonical Examples

- A right-skewed delivery-time population can produce a much steadier distribution of 36-trip sample means.
- A flat spinner can have evenly likely individual outcomes while its sample means pile up near the centre.
- A two-cluster score distribution can yield one central mound of sample means after averaging across enough observations.

## Common Misconceptions

- The theorem does not say the original population becomes normal.
- A larger sample size narrows the distribution of sample means; it does not reduce the true population spread.
- Normal approximation is about repeated sample means or sums, not about every individual observation being normal.

## PMOE-T Arc

- **Predict:** decide whether repeated means keep the population shape, become steadier, or change the population itself.
- **Manipulate:** change the population shape, sample size, and number of repeated samples.
- **Observe:** compare the population bars with the histogram of sample means.
- **Explain:** connect the observed narrowing to sigma divided by sqrt(n).
- **Transfer:** apply the same reasoning to right-skewed delivery times.
