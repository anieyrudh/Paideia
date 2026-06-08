# Transfer Problem: Anti-Aliasing Sensor Filter

A control sensor is sampled at `8 kHz`. The controller needs a `400 Hz` signal,
but the sensor also carries `4 kHz` noise. Choose a one-pole RC low-pass filter
that preserves the control signal while reducing the noise before sampling.

## Required Evidence

Your answer must include:

1. The proposed `R` and `C`.
2. The substitution for `tau = RC`.
3. The substitution for `f_c = 1 / (2 pi RC)`.
4. Magnitude ratio and dB at `400 Hz`.
5. Magnitude ratio and dB at `4 kHz`.
6. Phase at `400 Hz`.
7. A circuit check using `X_C`, `|Z|`, and `I_RMS` for a `1 V RMS` input.

## Example Direction

If `R = 10 kOhm` and `C = 0.047 uF`:

```text
R = 10000 Ohm
C = 0.047 uF = 0.000000047 F
tau = (10000)(0.000000047) = 0.00047 s
f_c = 1 / (2 pi 0.00047) = 338.6 Hz
```

That cutoff is close enough to affect the `400 Hz` control signal, so this pair
may reduce noise but could add too much amplitude loss and phase lag in the
control band. A stronger design explanation compares alternatives instead of
stopping at the first feasible-looking cutoff.

## Rubric

- Full credit: Uses SI units, computes cutoff, compares both signal and noise
  frequencies in magnitude and dB, reports phase at the control frequency, and
  explains the engineering tradeoff.
- Partial credit: Computes cutoff and one magnitude but omits phase or the
  circuit phasor check.
- No credit: Treats cutoff as an instant pass/fail boundary or chooses R and C
  without substitution.
