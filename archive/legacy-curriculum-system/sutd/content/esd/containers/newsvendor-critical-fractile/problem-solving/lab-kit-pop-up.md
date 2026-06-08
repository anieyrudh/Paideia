# Lab Kit Pop-Up Transfer

A one-day lab-kit pop-up must choose stock before demand is known. A missed kit costs 24 SGD per unit and a leftover kit costs 8 SGD per unit.

The demand forecast is:

| Demand (kits) | Probability | Cumulative probability |
|---:|---:|---:|
| 50 | 0.10 | 0.10 |
| 70 | 0.20 | 0.30 |
| 90 | 0.30 | 0.60 |
| 110 | 0.25 | 0.85 |
| 130 | 0.15 | 1.00 |

## Task

1. Compute the critical fractile.
2. Choose the smallest order quantity whose cumulative probability reaches the critical fractile.
3. State whether the answer sits above or below mean demand.
4. Explain the cost tradeoff in plain language.

## Expected Solution

`CR = C_under / (C_under + C_over) = 24 / (24 + 8) = 0.75`.

The first cumulative probability at least 0.75 occurs at 110 kits, because `F(90) = 0.60` is too low and `F(110) = 0.85` reaches the target.

Mean demand is `50(0.10) + 70(0.20) + 90(0.30) + 110(0.25) + 130(0.15) = 93` kits, so the critical-fractile order is above mean demand.

Interpretation: a missed kit is three times as costly as a leftover kit, so the decision accepts more leftover risk to avoid expensive shortages.
