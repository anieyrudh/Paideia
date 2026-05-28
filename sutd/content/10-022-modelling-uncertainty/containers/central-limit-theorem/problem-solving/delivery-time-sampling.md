# Transfer Problem: Delivery-Time Sampling

A delivery platform has a right-skewed trip-time population with mean 18 minutes and standard deviation 12 minutes. You take many independent samples of 36 trips and average each sample.

## Worked Solution

1. The statistic is a sample mean, so the central limit theorem applies to the repeated averages.
2. The sampling distribution is centred at the population mean: mu_xbar = 18 minutes.
3. The standard error is sigma_xbar = 12 minutes / sqrt(36) = 2 minutes.
4. Because n = 36, a normal approximation for the sample means is reasonable even though individual trip times are right-skewed.
5. Interpretation: most 36-trip averages should be much closer to 18 minutes than individual trips are, but the platform's underlying trip-time population has not changed.
