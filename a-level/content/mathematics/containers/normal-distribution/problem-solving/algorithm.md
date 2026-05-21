# Normal Distribution Problem-Solving Algorithm

1. Identify the model.

   Write \(X \sim N(\mu,\sigma^2)\), naming what \(X\) measures and its unit.

2. Translate the probability statement.

   Decide whether the question asks for a left tail, right tail, or interval:

   ```text
   P(X <= a), P(X >= b), or P(a <= X <= b)
   ```

3. Standardise every raw boundary.

   ```text
   z = (x - mu) / sigma
   ```

   The numerator and denominator must be in the same unit. The z-score is unitless.

4. Read the standard normal area.

   Use a standard normal table, calculator, or approved numerical CDF:

   ```text
   P(a <= X <= b) = Phi(z_b) - Phi(z_a)
   P(X >= b) = 1 - Phi(z_b)
   P(X <= a) = Phi(z_a)
   ```

5. Interpret in context.

   Report the answer as a probability or percentage and connect it to the original variable. Avoid saying that the z-score is the probability.

## Checks

- Does \(\sigma\) appear as the standard deviation, not the variance?
- Are all raw boundaries standardised before area lookup?
- Is the final answer an area, not a z-location?
- Does the interpretation refer to a random observation from the model?
