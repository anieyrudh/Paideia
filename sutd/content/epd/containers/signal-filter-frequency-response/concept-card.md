---
subject: epd
concept: signal-filter-frequency-response
branch: sutd
level: Undergraduate
syllabus_ref: SUTD EPD / Signals and Systems / Control and Engineering Systems / frequency response of first-order filters
prerequisites:
  - bode-stability-margin
  - circuit-phasor-reasoning
  - oscillations
aid_types:
  - simulation
  - misconception-audit
  - transfer-problem
status: reviewed
---

# Signal Filter Frequency Response

A signal filter changes sinusoidal inputs differently at different frequencies.
For a first-order RC filter, the resistor and capacitor form a frequency-dependent
voltage divider: the capacitor impedance is large at low frequency and small at
high frequency.

The same physical circuit can be read in two standard ways:

- Low-pass: output across the capacitor. Low-frequency signals pass, high-frequency signals are attenuated.
- High-pass: output across the resistor. High-frequency signals pass, low-frequency signals are attenuated.

## First-Principles Explanation

For a resistor `R` in series with a capacitor `C`, the time constant is:

```text
tau = RC
```

The cutoff angular frequency and ordinary frequency are:

```text
omega_c = 1 / tau
f_c = 1 / (2 pi tau) = 1 / (2 pi RC)
```

At cutoff, a one-pole RC filter has magnitude:

```text
|H(j omega_c)| = 1 / sqrt(2) = 0.707
20 log10(0.707) = -3.01 dB
```

This is not zero output. Cutoff is the knee of a gradual response curve. A
one-pole filter changes by about `20 dB` per decade after the knee, so one
decade beyond cutoff is strongly attenuated but still finite.

## Why Phase Matters

Magnitude says how much of the sinusoid remains. Phase says how the output is
shifted in time. For a low-pass RC filter, phase moves toward `-90 deg`; for a
high-pass RC filter, it moves from `+90 deg` toward `0 deg`. Near cutoff, the
phase is already about `45 deg` in magnitude.

That matters in engineering systems because a sensor or actuator filter can
change timing even when the amplitude looks acceptable. In a feedback loop, that
extra timing shift can reduce stability margin.

## Canonical Example

Take `R = 10 kOhm` and `C = 0.01 uF`.

```text
R = 10000 Ohm
C = 0.01 uF = 0.00000001 F
tau = RC = (10000)(0.00000001) = 0.0001 s
f_c = 1 / (2 pi 0.0001) = 1591.5 Hz
```

At `f_c`, the low-pass output magnitude is about `0.707` of the input and the
phase is `-45 deg`. At `10 f_c`, the output is around `0.10` of the input, or
about `-20 dB`, not zero.

## Common Misconceptions

**Filters remove frequencies instantly at cutoff.** A real first-order RC filter
has a smooth transition. The cutoff point marks `-3 dB`, not an ideal brick-wall
edge.

**Phase is optional decoration.** Phase is part of the response. It records
timing shift, and timing shift can matter as much as amplitude in control and
measurement systems.

**A low-pass and high-pass filter need different components.** The same series
RC circuit gives low-pass or high-pass behavior depending on which component's
voltage is measured.

## Transfer

When choosing an anti-aliasing filter, you do not only ask whether the desired
signal is below cutoff. You calculate the cutoff, read magnitude at the desired
signal and the unwanted noise, and check the phase shift where the controller
uses the measurement.
