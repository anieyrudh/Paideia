# Problem-Solving Algorithm

1. List the demand outcomes and their probabilities.
2. Identify the underage cost per unmet unit and overage cost per leftover unit.
3. Compute the critical fractile: `CR = C_under / (C_under + C_over)`.
4. Build the cumulative distribution `F(Q)`.
5. Choose the smallest order quantity `Q` where `F(Q) >= CR`.
6. Check units: costs are in SGD/unit, `Q` is in units, and `F(Q)` is a probability.
7. Interpret the direction: high shortage cost pushes the target service level up; high leftover cost pushes it down.

## Worked Transfer

A lab-kit pop-up has shortage cost 24 SGD/unit and leftover cost 8 SGD/unit.

`CR = 24 / (24 + 8) = 0.75`.

If the cumulative demand probabilities at 50, 70, 90, 110, and 130 kits are 0.10, 0.30, 0.60, 0.85, and 1.00, choose 110 kits because it is the first quantity where `F(Q)` reaches at least 0.75.

Interpretation: the order is above the middle of the distribution because a missed kit costs three times as much as a leftover kit.
