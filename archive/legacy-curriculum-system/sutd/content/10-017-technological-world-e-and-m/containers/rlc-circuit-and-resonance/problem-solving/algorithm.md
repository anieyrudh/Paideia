# RLC Resonance Problem Algorithm

1. Convert all component values to SI units: ohms, henrys, farads, hertz, volts RMS.
2. Compute the angular frequency for the drive: omega = 2 pi f.
3. Compute reactances: X_L = omega L and X_C = 1 / (omega C).
4. Combine series impedance as Z = R + j(X_L - X_C).
5. Compute the impedance magnitude: |Z| = sqrt(R^2 + (X_L - X_C)^2).
6. Compute RMS current: I = V_RMS / |Z|.
7. If a target resonant frequency is given, rearrange f0 = 1 / (2 pi sqrt(LC)) for the missing L or C.
8. At resonance, use X_L = X_C and |Z| = R; do not set impedance to zero.
9. Interpret Q = (1 / R) sqrt(L / C) and bandwidth = f0 / Q as the sharpness of the tuning.
