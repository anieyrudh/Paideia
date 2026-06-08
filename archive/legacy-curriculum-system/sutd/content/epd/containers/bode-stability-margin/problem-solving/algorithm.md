# Bode Stability Margin · problem-solving algorithm

1. Write the open-loop transfer as L(s), keeping actuator and sensor lag inside the loop.
2. Sample L(j omega) across the frequency range where magnitude crosses 0 dB and phase approaches -180 degrees.
3. Find the gain crossover frequency omega_gc where |L(j omega_gc)| = 1.
4. Read the phase at omega_gc and calculate phase margin as 180 degrees plus that phase.
5. Find the phase crossover frequency omega_pc where angle L(j omega_pc) = -180 degrees.
6. Read the magnitude at omega_pc and calculate gain margin in dB as the negative of that magnitude.
7. Interpret the design: low or negative phase margin means the loop is too close to oscillation; larger margin gives robustness but may slow response.
