---
subject: physics
concept: circuit-phasor-reasoning
branch: shared
level: "Shared core"
syllabus_ref: "Shared physics / Signals and circuits / AC phasor reasoning"
prerequisites:
  - circuits
  - sinusoidal-functions
aid_types:
  - concept-card
  - simulation
  - misconception-audit
  - transfer-problem
status: reviewed
---

# Circuit & Phasor Lab

## First-Principles Explanation

An AC circuit driven by a sinusoidal supply is not solved by resistance alone.
Each component contributes an opposition to changing current:

- a resistor contributes resistance `R`, which is in phase with current;
- an inductor contributes inductive reactance `X_L = 2 pi f L`, which makes current lag voltage;
- a capacitor contributes capacitive reactance `X_C = 1 / (2 pi f C)`, which makes current lead voltage.

For a series RLC circuit, these combine into one impedance vector:

```latex
Z = R + j(X_L - X_C)
```

The real part `R` lies along the horizontal axis. The imaginary part
`X_L - X_C` lies on the vertical axis. The length of this vector sets the rms
current:

```latex
I_{rms} = \frac{V_{rms}}{|Z|}
```

The angle of the impedance vector sets the phase shift. If the imaginary part is
positive, the circuit is inductive and current lags the voltage. If it is
negative, the circuit is capacitive and current leads the voltage. If it is near
zero, the circuit behaves mostly resistively and current is nearly in phase.

## Why This Matters

Phasors turn a time-shifting AC problem into a vector problem. That is why the
same reasoning appears in circuits, filters, resonance, motors, communication
signals, and control systems. The learner is not memorising "inductors lag" as a
slogan; they are reading the sign and size of a vector component.

## Canonical Example

A 12 V rms, 50 Hz supply drives a series circuit with `R = 40 ohm`,
`L = 0.18 H`, and `C = 120 microfarad`.

```latex
X_L = 2\pi(50)(0.18) = 56.5\ \Omega
```

```latex
X_C = \frac{1}{2\pi(50)(120\times10^{-6})} = 26.5\ \Omega
```

```latex
Z = 40 + j(56.5 - 26.5) = 40 + j30.0\ \Omega
```

```latex
|Z| = 50.0\ \Omega,\quad I_{rms} = 12 / 50.0 = 0.24\ \mathrm{A}
```

The net reactance is positive, so the circuit is inductive and current lags the
voltage.

## Common Misconceptions

- **"Phasors are physical rotating wires."** A phasor is a representation of
  sinusoidal magnitude and phase, not an object in the circuit.
- **"Any resistor makes current and voltage in phase."** A resistor contributes
  the real part of impedance, but the phase angle also depends on net reactance.
- **"Current is used up by components."** In a series circuit the same current
  passes through every element; voltage drops differ in phase.
