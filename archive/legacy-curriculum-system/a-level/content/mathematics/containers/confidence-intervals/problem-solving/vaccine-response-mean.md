# Transfer Problem Rubric: Vaccine Response Mean

## Prompt

A clinic measures antibody response scores after a booster. A sample of 64 patients has mean 72.4 units. The population standard deviation is known to be 11.2 units. Construct a 95% confidence interval for the population mean response, then decide whether a claimed mean of 70 units is compatible with the interval.

## Worked Solution

```text
xbar = 72.4 units
sigma = 11.2 units
n = 64
z* = 1.960 for 95% confidence

SE = 11.2 / sqrt(64)
   = 11.2 / 8
   = 1.40 units

margin = 1.960 x 1.40
       = 2.744 units

CI = 72.4 +/- 2.744
   = [69.656, 75.144] units
```

Rounded suitably, the 95% confidence interval is `[69.7, 75.1]` units.

The claimed mean of 70 units lies inside the interval, so this interval is compatible with the claim. The safe interpretation is that the 95% interval-making method would capture the true population mean response in about 95% of repeated samples of this kind.

## Rubric

- 2 marks: extracts `xbar`, `sigma`, `n`, confidence level, and units correctly.
- 2 marks: computes `SE = sigma / sqrt(n)` with units.
- 2 marks: selects the correct 95% two-sided multiplier `z* = 1.960`.
- 2 marks: forms both endpoints from `xbar +/- z*SE`.
- 2 marks: interprets the interval in context and checks whether 70 units lies inside.

Common deductions:

- Treating the confidence level as the probability that this fixed population mean lies inside the already computed interval.
- Using `sigma / n` instead of `sigma / sqrt(n)`.
- Omitting units from the margin or endpoints.
