---
subject: physics
concept: alternating-current
branch: a-level
level: "H2"
syllabus_ref: "9478 / Section V / Electricity and Magnetism"
prerequisites:
  - circuits
  - oscillations
  - waves
aid_types:
  - simulation
  - misconception-audit
  - transfer-problem
status: reviewed
---

# Alternating Current

## First-principles explanation

An alternating current reverses direction periodically because the supply
potential difference is sinusoidal. The instantaneous voltage may be positive,
zero, or negative, but the circuit can still transfer energy because power
depends on the product of voltage and current. RMS values package the heating
effect of a sinusoid into the equivalent steady DC value: for a sine wave,
`V_rms = V_peak / sqrt(2)` and `I_rms = I_peak / sqrt(2)`.

## Key definitions

- **Instantaneous value:** the value of voltage or current at one moment, such as `v = V_peak sin(omega t)`.
- **Peak value:** the maximum magnitude reached by a sinusoidal voltage or current.
- **RMS value:** the root-mean-square value; the DC value that gives the same mean power in a resistor.
- **Frequency:** cycles per second, measured in hertz; it controls how fast the waveform repeats.
- **Reactance:** opposition from an inductor or capacitor in AC, measured in ohms.
- **Impedance:** the vector combination `Z = R + jX`, where `X = X_L - X_C`.
- **Phase difference:** how far one sinusoid is shifted relative to another, measured in degrees or radians.
- **Power factor:** `cos(phi)`, the fraction of apparent power transferred as real power.

## Why this matters

AC is the language of mains electricity, transformers, motors, and signal
circuits. If a learner treats rms as an ordinary average, they predict zero
useful voltage from a symmetric waveform. If they ignore phase and impedance,
they use `I = V/R` where the load actually depends on frequency, inductance,
and capacitance.

## Canonical examples

- A 12 V rms sinusoidal supply has peak voltage `12 sqrt(2) V`, independent of frequency when peak voltage is fixed.
- In a series RLC circuit, raising frequency increases `X_L = 2 pi f L` and decreases `X_C = 1 / (2 pi f C)`.
- An inductive load has positive net reactance, so current lags voltage; a capacitive load has negative net reactance, so current leads voltage.

## Common misconceptions

- RMS is not the arithmetic average of the signed waveform.
- Higher frequency does not automatically make the source rms voltage larger.
- Resistance alone does not set current in an RLC AC load.
- A phase difference must include sign: leading and lagging are not interchangeable.

## What the student does

The learner predicts whether frequency changes source rms value, adjusts a
series RLC circuit, and then reveals a waveform chart, phasor diagram, current
readout, phase sign, and power calculation. Every revealed calculation shows
the formula, substitution, units, and interpretation beside a symbol legend.
The transfer task asks the learner to repeat the same reasoning for a laptop
adapter power-factor check.

## Pedagogical choices and why

- **Predict format:** multiple choice, because the target misconception is a crisp alternative: frequency changes repetition rate, not the rms conversion for fixed peak voltage.
- **Manipulate variables:** rms supply voltage, frequency, resistance, inductance, capacitance, and a time marker. These expose the physical knobs of the RLC circuit without asking learners to edit phasor algebra directly.
- **Transfer problem:** a laptop adapter changes the surface from an in-sim phasor lab to a realistic power-factor calculation while preserving rms, impedance, phase, and power reasoning.

## Misconceptions this surfaces

- **RMS is an arithmetic average voltage** - a learner may say the average of positive and negative halves is zero; the lab shows the rms value is tied to equivalent power.
- **Higher frequency always means higher rms value** - a learner may predict a larger rms value; the lab separates source rms conversion from frequency-dependent load reactance.
- **Resistance alone sets current in every AC circuit** - a learner may use `I = V/R`; the lab shows current is `V_rms / |Z|`.
- **Leading and lagging phase are interchangeable** - a learner may name a shift without sign; the lab links sign to inductive or capacitive character.

## Notes for the teacher

Start with a fixed peak-voltage thought experiment before moving to RLC loads:
it prevents students from mixing up source waveform size and load behaviour.
When students calculate phase, require a sentence that says whether current
leads or lags voltage, not just a signed angle.
