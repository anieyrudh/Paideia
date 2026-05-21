# Alternating Current Problem-Solving Algorithm

Use this sequence for sinusoidal supplies and series RLC loads.

1. **Identify waveform values.** Decide whether the question gives peak or rms values. For a sinusoid, use `V_rms = V_peak / sqrt(2)` and `I_rms = I_peak / sqrt(2)`.
2. **Convert component units.** Put `L` in henrys, `C` in farads, and `f` in hertz.
3. **Calculate reactances.** Use `X_L = 2 pi f L` and `X_C = 1 / (2 pi f C)`, both in ohms.
4. **Build impedance.** Use `X = X_L - X_C` and `|Z| = sqrt(R^2 + X^2)`.
5. **Find rms current.** Use `I_rms = V_rms / |Z|`, in amperes.
6. **Decide phase.** Use `phi_I = -atan2(X, R)`. Positive current phase means current leads voltage; negative means current lags.
7. **Calculate power if needed.** Use `P = V_rms I_rms cos(phi)`, in watts. State the interpretation, not just the number.
8. **Check reasonableness.** Units should be consistent; lowering `|Z|` should increase `I_rms`; frequency changes reactance but not the rms conversion for a fixed peak sinusoid.
