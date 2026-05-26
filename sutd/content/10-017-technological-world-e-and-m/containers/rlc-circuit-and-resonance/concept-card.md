---
concept: rlc-circuit-and-resonance
title: "RLC Circuit and Resonance"
branch: sutd
subject: 10-017-technological-world-e-and-m
level: Undergraduate
module: "10.017 Technological World: Electricity and Magnetism"
summary: "A series RLC circuit resonates when inductive and capacitive reactance cancel, leaving resistance to set the current."
---

# RLC Circuit and Resonance

## First-Principles Explanation

In a sinusoidal steady-state series RLC circuit, the resistor, inductor, and
capacitor carry the same RMS current. Their opposition to current is impedance:

```latex
Z = R + j\left(X_L - X_C\right)
```

The reactances are frequency-dependent:

```latex
X_L = 2\pi f L
```

```latex
X_C = \frac{1}{2\pi f C}
```

At low frequency, the capacitor reactance is large and the circuit is
capacitive, so current leads the source voltage. At high frequency, inductor
reactance is large and the circuit is inductive, so current lags the source
voltage.

Resonance occurs when `X_L = X_C`:

```latex
f_0 = \frac{1}{2\pi\sqrt{LC}}
```

At that frequency, reactance cancels but resistance remains. The impedance
magnitude is approximately `R`, so current is maximised but not infinite.

## Why This Matters

Tuned radio receivers, filters, wireless power links, sensor front-ends, and
vibration analogues all depend on selecting the frequency where stored electric
and magnetic energy exchange efficiently.

## Canonical Example

For `R = 20 ohm`, `L = 0.10 H`, and `C = 100 microF`:

```latex
f_0 = \frac{1}{2\pi\sqrt{(0.10\ H)(100\times10^{-6}\ F)}} = 50.3\ Hz
```

At `50.3 Hz`, `X_L` and `X_C` are both about `31.6 ohm`, so net reactance is
near zero. A `10 V RMS` source gives:

```latex
I_{\mathrm{rms}} = \frac{10\ V}{20\ \Omega} = 0.50\ A
```

## Common Misconceptions

- Resonance cancels reactance, not resistance.
- Current is largest when total impedance is smallest, not when one reactance is
  large.
- A high-Q circuit has a narrow bandwidth; it is selective but sensitive to
  detuning.

## Transfer

To tune a receiver, choose `C` from the target `f0` and the available inductor,
then use the series resistance to estimate the resonant current and bandwidth.
