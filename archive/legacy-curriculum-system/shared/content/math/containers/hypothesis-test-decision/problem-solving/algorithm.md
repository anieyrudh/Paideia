# Hypothesis Test Decision Algorithm

1. **State the hypotheses.** Write the null mean as `H0: mu = mu0` and choose the alternative tail: greater, less, or two-sided.
2. **Choose alpha before looking at the decision.** Alpha fixes how much null-model tail area counts as unusually extreme.
3. **Compute the standard error.** Divide the known population standard deviation by the square root of sample size.
4. **Compute the z statistic.** Subtract the null mean from the observed mean, then divide by the standard error.
5. **Compare with the correct rejection region.** Use the upper boundary for a greater-than test, the negative boundary for a less-than test, and both tails for a two-sided test.
6. **Make the statistical decision.** Reject the null only when the statistic is inside the rejection region.
7. **Interpret in context.** Say what the evidence supports, and keep statistical significance separate from practical importance.

## Decision Tree

- If the alternative is `greater`, reject when `z >= critical boundary`.
- If the alternative is `less`, reject when `z <= -critical boundary`.
- If the alternative is `two-sided`, reject when `|z| >= critical boundary`.

## Guardrails

- Do not conclude that the null is true when the test does not reject.
- Do not call a result important just because it is statistically significant.
- Do not compare the raw sample mean with alpha; alpha belongs to the tail decision rule.
