# Problem-Solving Algorithm

Use this when a series AC circuit asks for current magnitude, lead/lag, or a
phasor explanation.

1. List the known values: `V_rms`, `f`, `R`, `L`, and `C`.
2. Compute inductive reactance:

   ```latex
   X_L = 2\pi fL
   ```

3. Compute capacitive reactance:

   ```latex
   X_C = \frac{1}{2\pi fC}
   ```

4. Build the impedance vector:

   ```latex
   Z = R + j(X_L - X_C)
   ```

5. Find its magnitude:

   ```latex
   |Z| = \sqrt{R^2 + (X_L-X_C)^2}
   ```

6. Use rms Ohm's law for impedance:

   ```latex
   I_{rms} = \frac{V_{rms}}{|Z|}
   ```

7. Interpret the sign of `X_L - X_C`.

   - Positive means inductive: current lags voltage.
   - Negative means capacitive: current leads voltage.
   - Near zero means mostly resistive: current is nearly in phase.

## Checks

- Units: `R`, `X_L`, `X_C`, and `|Z|` are in ohms; `I_rms` is in amperes.
- Series condition: the same rms current passes through every element.
- Phase condition: voltage is the reference; current phase is the negative of
  the impedance angle.
