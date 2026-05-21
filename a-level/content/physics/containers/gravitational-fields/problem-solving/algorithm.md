# Problem-Solving Algorithm

1. Identify the source mass `M`, the test mass `m`, and the radius `r` from the centre of the source mass.
2. Decide whether the question asks for field strength, force, potential, potential energy, or orbital speed.
3. Use field strength before force:

   ```text
   g = GM / r^2
   F = mg
   ```

4. Use zero at infinity for gravitational potential:

   ```text
   phi = -GM / r
   E_p = m phi
   ```

5. For a circular orbit, equate gravity to centripetal force and cancel the test mass:

   ```text
   GMm / r^2 = mv^2 / r
   v = sqrt(GM / r)
   ```

6. Interpret the sign and direction. Field vectors point inward; negative potential means the mass is bound relative to zero at infinity.

## Decision checks

- If only the probe mass changes, `F` and `E_p` change but `g`, `phi`, and circular-orbit speed do not.
- If radius doubles, `g` becomes one quarter as large, `phi` becomes one half as large in magnitude, and `v` is divided by `sqrt(2)`.
- If source mass doubles, `g` and `phi` double in magnitude, while `v` is multiplied by `sqrt(2)`.
