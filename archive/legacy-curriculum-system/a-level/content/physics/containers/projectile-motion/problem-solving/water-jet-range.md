# Transfer Problem: Water Jet Range

A water jet leaves a hose 1.2 m above the ground at 9.0 m s^-1 and 25 degrees
above the horizontal. Estimate its range, then explain which part of the
calculation changes if the launch height is doubled.

## Expected Approach

1. Resolve the launch velocity:

   ```latex
   u_x = 9.0\cos25^\circ,\qquad u_y = 9.0\sin25^\circ
   ```

2. Solve the vertical landing equation:

   ```latex
   0 = 1.2 + u_y t - \frac{1}{2}(9.81)t^2
   ```

3. Use the positive time in:

   ```latex
   R = u_x t
   ```

Doubling the launch height changes the vertical equation and therefore the
time of flight. The horizontal component stays the same, but it acts for a
longer time.

## Rubric

- Correctly resolves horizontal and vertical velocity components.
- Uses the landing-height condition in the vertical equation.
- Uses the positive root for time of flight.
- Computes range from horizontal component and time.
- Explains that height changes time, not horizontal velocity.
