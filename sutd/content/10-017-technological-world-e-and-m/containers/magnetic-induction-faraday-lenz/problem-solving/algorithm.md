# Problem-Solving Algorithm

Use this sequence for uniform-field Faraday-Lenz questions with a flat coil.

1. Choose a positive flux direction and keep it fixed. This container uses
   "out of the page" as positive in the default prediction prompt.
2. Convert field, area, and time to SI units:

   ```latex
   B\ \mathrm{in\ T},\quad A\ \mathrm{in\ m^2},\quad t\ \mathrm{in\ s}
   ```

3. Compute one-turn initial and final flux:

   ```latex
   \Phi = BA\cos\theta
   ```

4. Compute the flux change and induced emf:

   ```latex
   \mathcal{E} = -N\frac{\Delta\Phi}{\Delta t}
   ```

5. If the circuit is closed through a simple load, compute current magnitude:

   ```latex
   I = \frac{|\mathcal{E}|}{R}
   ```

6. Interpret Lenz direction from the sign of the flux change. If positive flux
   increases, the induced field points in the negative direction. If positive
   flux decreases, the induced field points in the positive direction.

7. Check units and design limits. The flux unit is weber, emf is volt, and
   current is ampere.
