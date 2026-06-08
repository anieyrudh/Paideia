# Transfer Problem: Laptop Adapter Power-Factor Check

## Prompt

A laptop adapter is connected to a 12 V rms sinusoidal supply at 50 Hz. Its
equivalent series load is `R = 40 ohm`, `L = 0.18 H`, and `C = 120 microF`.
Calculate the rms current, decide whether current leads or lags the voltage,
and find the real power transferred.

## Worked Solution

### 1. Convert units

Formula: use SI units in reactance formulae.

Substitution: `L = 0.18 H`; `C = 120 microF = 120 x 10^-6 F`.

Units: henry and farad.

Interpretation: the numbers can now be used directly with `f = 50 Hz`.

### 2. Calculate reactance

Formula: `X_L = 2 pi f L`; `X_C = 1 / (2 pi f C)`.

Substitution: `X_L = 2 pi x 50 Hz x 0.18 H = 56.55 ohm`.

Substitution: `X_C = 1 / (2 pi x 50 Hz x 120 x 10^-6 F) = 26.53 ohm`.

Units: both reactances are measured in ohms.

Interpretation: `X_L > X_C`, so the net reactance is inductive.

### 3. Build impedance

Formula: `X = X_L - X_C`; `|Z| = sqrt(R^2 + X^2)`.

Substitution: `X = 56.55 ohm - 26.53 ohm = 30.02 ohm`.

Substitution: `|Z| = sqrt((40 ohm)^2 + (30.02 ohm)^2) = 50.02 ohm`.

Units: impedance magnitude is measured in ohms.

Interpretation: the AC load opposes current more than the resistor alone.

### 4. Find rms current

Formula: `I_rms = V_rms / |Z|`.

Substitution: `I_rms = 12 V / 50.02 ohm = 0.240 A`.

Units: amperes.

Interpretation: the series current through every component is about `0.240 A rms`.

### 5. Decide phase

Formula: `phi_I = -atan2(X, R)`.

Substitution: `phi_I = -atan2(30.02 ohm, 40 ohm) = -36.9 degrees`.

Units: degrees.

Interpretation: negative current phase means current lags the voltage.

### 6. Calculate real power

Formula: `P = V_rms I_rms cos(phi)`.

Substitution: `P = 12 V x 0.240 A x cos(36.9 degrees) = 2.30 W`.

Units: watts.

Interpretation: only the resistive part transfers mean power; the reactive
part stores and returns energy each cycle.

## Symbol Legend

| Symbol | Meaning | Unit |
| --- | --- | --- |
| `V_rms` | effective supply voltage | V |
| `I_rms` | effective series current | A |
| `R` | resistance | ohm |
| `L` | inductance | H |
| `C` | capacitance | F |
| `X_L`, `X_C`, `X` | inductive, capacitive, and net reactance | ohm |
| `Z` | impedance | ohm |
| `P` | real power | W |
