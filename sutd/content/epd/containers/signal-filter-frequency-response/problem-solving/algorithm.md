# Problem-Solving Algorithm

Use this procedure for any first-order RC low-pass or high-pass filter.

## 1. Identify the measured output

- Output across the capacitor: low-pass.
- Output across the resistor: high-pass.

Do not decide from the component list alone. The measured output node determines
the filter type.

## 2. Convert component values to SI units

```text
R_ohm = R_kOhm x 1000
C_F = C_uF x 10^-6
```

Example:

```text
R = 10 kOhm = 10000 Ohm
C = 0.01 uF = 0.00000001 F
```

## 3. Calculate the time constant and cutoff

```text
tau = RC
omega_c = 1 / tau
f_c = omega_c / (2 pi) = 1 / (2 pi RC)
```

Example:

```text
tau = (10000)(0.00000001) = 0.0001 s
f_c = 1 / (2 pi 0.0001) = 1591.5 Hz
```

## 4. Choose the transfer function

Low-pass output across C:

```text
H_LP(s) = 1 / (1 + sRC)
```

High-pass output across R:

```text
H_HP(s) = sRC / (1 + sRC)
```

## 5. Read magnitude and phase at the frequencies that matter

Substitute `s = j 2 pi f`.

For low-pass:

```text
|H_LP(j 2 pi f)| = 1 / sqrt(1 + (2 pi f RC)^2)
phase = -atan(2 pi f RC)
```

For high-pass:

```text
|H_HP(j 2 pi f)| = (2 pi f RC) / sqrt(1 + (2 pi f RC)^2)
phase = 90 deg - atan(2 pi f RC)
```

Then convert magnitude to decibels when comparing Bode plots:

```text
magnitude_dB = 20 log10(|H|)
```

## 6. Check the circuit phasor interpretation

For a series RC circuit:

```text
X_C = 1 / (2 pi f C)
|Z| = sqrt(R^2 + X_C^2)
I_RMS = V_RMS / |Z|
```

This check connects the transfer-function trace to a physical current and
impedance. If the Bode plot and the phasor story disagree, the model has been
read incorrectly.

## 7. Interpret, do not label only

State whether the frequency is in the pass band, transition band, or attenuated
band. Then state what phase shift implies for timing. A good answer includes
both amplitude and phase.
