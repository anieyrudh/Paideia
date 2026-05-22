# Transfer Problem: Battery-Life Quality Claim

A battery maker claims the mean life is 10.0 hours. A quality team samples 49 batteries, finds a mean of 9.6 hours, and uses a known population standard deviation of 1.4 hours. At the 5% level, decide whether there is evidence that the mean life is lower than claimed.

## Expected Solution

Declare the hypotheses:

```latex
H_0: \mu = 10.0
\qquad
H_1: \mu < 10.0
```

Compute the standard error:

```latex
SE = \frac{1.4\ \mathrm{h}}{\sqrt{49}} = 0.20\ \mathrm{h}
```

Compute the test statistic:

```latex
z = \frac{9.6\ \mathrm{h} - 10.0\ \mathrm{h}}{0.20\ \mathrm{h}} = -2.00
```

For a 5% lower-tail test, the critical boundary is `-1.645`. Since `-2.00 <= -1.645`, reject the null hypothesis.

## Interpretation

At the 5% significance level, the sample provides statistically significant evidence that the mean battery life is below 10.0 hours. This conclusion does not by itself measure warranty cost or customer impact; those require practical effect-size context.

## Rubric

- Correctly states lower-tail hypotheses.
- Computes standard error with units.
- Computes z statistic with substituted values.
- Uses the lower-tail critical boundary.
- Gives a contextual statistical decision and avoids saying the null is proven false with certainty.
