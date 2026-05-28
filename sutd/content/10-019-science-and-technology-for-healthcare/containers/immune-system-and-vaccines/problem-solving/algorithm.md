# Problem-Solving Algorithm

1. Identify the pathogen's basic reproduction number `R0`.
2. Compute the herd-immunity threshold `p* = 1 - 1/R0`.
3. Identify the vaccination coverage `p0` at day 0.
4. If immunity wanes, compute the effective coverage at time `t`: `p(t) = p0 * exp(-lambda * t)`.
5. Compute the effective reproduction number `Re = R0 * (1 - p(t))`.
6. Compare `p(t)` with `p*` and `Re` with 1:
   - `Re < 1`: outbreak shrinks; we say it is contained.
   - `Re = 1`: marginal.
   - `Re > 1`: outbreak grows.
7. Interpret in plain language. Discuss what would need to change (higher coverage, lower R0, slower waning, scheduled boosters) for the outbreak to be contained.
8. Optionally compute the booster dose required to lift the effective coverage back above `p*` and the cadence implied by the waning rate.
