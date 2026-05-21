# Confidence Interval Algorithm

Use this when the question asks for a confidence interval for a population mean with known population standard deviation.

1. Identify the parameter.
   - State that the interval estimates the population mean.
   - Record the context units.

2. Extract the sample information.
   - Sample mean: `xbar`
   - Population standard deviation: `sigma`
   - Sample size: `n`
   - Confidence level

3. Compute the standard error.

```text
SE = sigma / sqrt(n)
```

4. Choose the two-sided normal multiplier.

```text
90%: z* = 1.645
95%: z* = 1.960
99%: z* = 2.576
```

5. Compute the margin of error.

```text
margin = z* x SE
```

6. Build the interval.

```text
lower = xbar - margin
upper = xbar + margin
```

7. Interpret in context.
   - Include the confidence level, the parameter, the interval endpoints, and the units.
   - Use repeated-sampling wording: the method captures the true mean in about the stated proportion of repeated samples.

8. Check claims against endpoints.
   - If a claimed mean lies inside the interval, the interval is compatible with that claim.
   - If it lies outside, the interval does not support that claim at the matching confidence level.
