# Receiver Tuning Transfer Problem

## Problem

A receiver coil has L = 0.20 H and R = 18 ohm. Choose a capacitor so the circuit resonates at 800 Hz, then estimate the resonant current from a 6.0 V RMS source.

## Solution

At resonance,

```text
f0 = 1 / (2 pi sqrt(LC))
```

Rearrange for capacitance:

```text
C = 1 / ((2 pi f0)^2 L)
```

Substitute:

```text
C = 1 / ((2 pi x 800 Hz)^2 x 0.20 H)
  = 1.98 x 10^-7 F
  = 0.198 microF
```

At resonance, X_L and X_C cancel in the series total, so the impedance magnitude is the resistance:

```text
|Z| = R = 18 ohm
I_RMS = 6.0 V / 18 ohm
      = 0.333 A
```

## Rubric

- Full credit: rearranges the resonance formula for C, converts units, reports about 0.198 microF, and uses I = V / R at resonance.
- Partial credit: calculates the correct capacitor but uses a non-resonant impedance expression for the final current.
- Misconception flag: states that resonance makes impedance zero or current infinite.
