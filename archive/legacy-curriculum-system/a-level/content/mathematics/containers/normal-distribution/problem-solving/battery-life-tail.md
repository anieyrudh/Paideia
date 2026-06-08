# Transfer Problem: Battery-Life Upper Tail

## Prompt

A phone battery life is modelled by \(X \sim N(18.0, 2.4^2)\) hours. A reviewer calls a battery "long lasting" if it exceeds 21.5 hours. Find the probability that a randomly selected battery is long lasting, showing the standardisation and interpreting the answer.

## Worked Solution

The random variable \(X\) is battery life in hours, with mean 18.0 hours and standard deviation 2.4 hours.

```text
P(X > 21.5)
z = (21.5 - 18.0) / 2.4
  = 1.458
P(X > 21.5) = P(Z > 1.458)
            = 1 - Phi(1.458)
            approx 0.072
```

Interpretation: about 7.2% of batteries from this model are expected to last more than 21.5 hours.

## Rubric

- Identifies \(\mu=18.0\) hours and \(\sigma=2.4\) hours.
- Translates "exceeds 21.5 hours" into a right-tail probability.
- Shows \(z=(21.5-18.0)/2.4\).
- Uses a standard normal tail area, not the z-score as the final probability.
- Interprets the answer as a proportion or percentage of batteries.
