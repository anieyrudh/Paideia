# Markov Chain Steady State algorithm

Use this procedure for a two-state chain with state vector
`x_t = [P(S at t), P(C at t)]^T`.

1. Check the transition matrix convention.
   - Columns are current states.
   - Rows are next states.
   - Each column must sum to 1.

2. Build the transition matrix.

   ```text
   P = [[a, b],
        [1 - a, 1 - b]]
   ```

   Here `a = P(S next | S now)` and `b = P(S next | C now)`.

3. Forecast short-run state mixes.

   ```text
   x_(t+1) = P x_t
   ```

   Repeat this multiplication for the requested number of time steps.

4. Solve the steady-state equation.

   ```text
   pi = P pi
   pi_S + pi_C = 1
   pi_S = b / (b + 1 - a)
   pi_C = (1 - a) / (b + 1 - a)
   ```

5. Interpret the result.
   - The entries are long-run fractions of time or cases, not counts.
   - The units are probabilities per time step.
   - A steady distribution still has individual transitions; aggregate inflow
     and outflow balance.

6. Check reasonableness.
   - If recovery `b` rises while `a` is fixed, the smooth steady-state share
     should rise.
   - If the smooth-to-congested probability `1 - a` rises while `b` is fixed,
     the congested steady-state share should rise.
