# Conditional Probability and Bayes Problem-Solving Algorithm

1. Identify the prior probability `P(H)`.
2. Identify the true-positive route `P(+|H)P(H)`.
3. Identify the false-positive route `P(+|not H)P(not H)`.
4. Add both positive-result routes to form the denominator.
5. Divide the true-positive route by the denominator.
6. Interpret the posterior as a probability, not as a guarantee.

The key check is whether every positive-result path has been counted. Omitting
false positives turns sensitivity into a misleading posterior.
