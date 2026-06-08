# Problem-Solving Algorithm

Use this sequence for ideal parallel-plate dielectric capacitor questions.

1. Convert all geometry to SI units: area in square metres, separation in
   metres, and voltage in volts.
2. Identify whether voltage, charge, or isolation is held fixed. This container
   focuses on fixed-voltage design.
3. Compute capacitance:

   ```latex
   C = \frac{\kappa \epsilon_0 A}{d}
   ```

4. Compute stored charge:

   ```latex
   Q = CV
   ```

5. Compute stored energy:

   ```latex
   U = \frac{1}{2}CV^2
   ```

6. Check field strength and design limits:

   ```latex
   E = \frac{V}{d}
   ```

7. Interpret the tradeoff. Increasing `kappa` or `A` raises capacitance without
   raising field strength. Decreasing `d` raises capacitance and field strength,
   so it may violate an insulation limit.
