---
subject: epd
concept: bode-stability-margin
branch: sutd
level: "Undergraduate"
syllabus_ref: "SUTD EPD / Control and Engineering Systems / frequency response and stability margins"
prerequisites:
  - pid-step-response
  - transfer-functions
aid_types:
  - simulation
  - transfer-problem
  - misconception-audit
status: reviewed
---

# Bode Stability Margin

## First-Principles Explanation

A feedback loop becomes risky when its open-loop response is close to having magnitude 1 and phase -180 degrees at the same frequency. Magnitude 1 means the returned signal is large enough to reinforce the input, and -180 degrees means the returned signal arrives with the sign needed to turn negative feedback into positive feedback. A Bode plot separates those two facts: the magnitude plot shows where the loop crosses 0 dB, and the phase plot shows how close that same frequency is to -180 degrees.

## Key Definitions

- **Open-loop transfer L(s):** the controller, actuator, plant, and sensor multiplied around the loop before closing feedback.
- **Gain crossover frequency omega_gc:** the frequency where |L(j omega)| = 1, shown as 0 dB on the magnitude plot.
- **Phase margin:** the extra phase lag that can be added at omega_gc before the loop reaches -180 degrees.
- **Phase crossover frequency omega_pc:** the frequency where the phase of L(j omega) is -180 degrees.
- **Gain margin:** how many dB of gain can be added at omega_pc before the magnitude reaches 0 dB.

## Why this matters

EPD teams tune real loops under actuator, sensor, and delay constraints. Stability margins turn a Bode plot into a design decision: choose enough loop gain to respond, but preserve enough margin that modelling error, load changes, and implementation lag do not push the closed loop into oscillation.

## Canonical Examples

- A loop with 45 degrees of phase margin usually has a more robust buffer than a loop with 8 degrees of phase margin, even if both currently appear stable.
- Increasing loop gain can make response faster, but it moves gain crossover to a higher frequency where plant and sensor lags may have already consumed phase.
- A sensor lag that looks harmless in a step-response sketch can remove several degrees of margin near crossover.

## Common Misconceptions

- **Higher gain is always safer:** higher gain can reduce error at low frequency while reducing phase margin.
- **Magnitude alone decides stability:** a 0 dB crossing is only meaningful when paired with the phase at that same frequency.
- **Phase margin is a time-domain overshoot number:** it is read from frequency response, then interpreted as a robustness buffer for closed-loop behaviour.

## What the student does

The learner predicts how doubling loop gain affects phase margin, adjusts loop gain plus actuator and sensor lag, then reveals the Bode margin readout. The reveal includes the magnitude and phase traces, crossover frequencies, margin formulas, substituted values with units, and a design interpretation.

## Pedagogical choices and why

- **Predict format:** multiple choice, because the misconception about gain and phase margin has a clear falsifiable direction.
- **Manipulate variables:** loop gain and two lag constants are exposed because they directly move crossover and phase lag without requiring symbolic algebra.
- **Transfer problem:** the robot-arm velocity loop keeps the same margin-reading process but asks for a design choice in a different engineering surface.

## Misconceptions this surfaces

- **Higher gain always improves stability:** the doubled-gain case can cross 0 dB at a higher frequency where phase lag is worse.
- **Magnitude alone decides closed-loop stability:** the formula panel forces the learner to pair the magnitude crossing with the phase value at that crossing.

## Notes for the teacher

Ask students to compare the gain-2 and gain-4 presets before discussing overshoot. The useful teaching move is to make them say which frequency moved, not just which margin changed.
