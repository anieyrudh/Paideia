# Transfer Problem: Measurement Uncertainty Check

A student measures a trolley run as `1.20 m ± 0.01 m` in `3.0 s ± 0.2 s`.
Find the average speed with its unit and estimate the percentage uncertainty.
Then explain why the proposed shortcut `speed = distance + time` is not a
valid equation.

## Expected Reasoning

Average speed is distance divided by time:

```text
v = 1.20 m / 3.0 s = 0.40 m s^-1
```

For a division, add fractional uncertainties:

```text
distance percentage uncertainty = 0.01 / 1.20 × 100% ≈ 0.8%
time percentage uncertainty = 0.2 / 3.0 × 100% ≈ 6.7%
speed percentage uncertainty ≈ 7.5%
absolute uncertainty ≈ 0.075 × 0.40 m s^-1 ≈ 0.03 m s^-1
```

A suitable record is therefore:

```text
v = 0.40 ± 0.03 m s^-1
```

The shortcut `distance + time` is impossible because it tries to add length
`L` to time `T`. Addition requires the same dimension on both terms.

## Rubric

- Identifies speed as a derived scalar quantity.
- Converts the measurement into `m s^-1` using distance divided by time.
- Combines percentage uncertainties for a division.
- Rejects `distance + time` using dimensional consistency, not because the numbers look awkward.
