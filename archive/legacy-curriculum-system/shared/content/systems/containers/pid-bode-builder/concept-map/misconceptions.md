# Misconceptions

## High Gain Always Improves Control

Higher gains can improve speed or offset, but they can also increase overshoot and reduce phase margin. The simulation surfaces this by keeping the step response and Bode margin visible together after prediction.

## Bode Magnitude Alone Determines Stability

Magnitude crossing tells where the loop has unity gain. Stability margin also depends on phase at that crossover, so the phase trace and phase-margin formula are required.

## Derivative Gain Removes Steady-State Error

Derivative action reacts to slope and can add damping. Integral action is the term that directly accumulates persistent error and drives final offset down in the modeled loop.
