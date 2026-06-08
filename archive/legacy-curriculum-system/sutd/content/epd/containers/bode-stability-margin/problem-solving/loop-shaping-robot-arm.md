# Loop Shaping a Drone Altitude Loop

## Prompt

A drone altitude loop has an actuator lag of 0.55 s and a sensor-filter lag of 0.35 s. Choose a loop gain that preserves at least 30 degrees of phase margin while still improving response speed over a gain-1 baseline.

## Rubric

- Defines the same open-loop structure L(s) for both gain choices.
- Reads the gain crossover frequency before reading phase margin.
- Shows the phase-margin calculation with degrees.
- Uses gain margin as a second robustness check.
- Chooses a gain that preserves the 30 degree design buffer instead of copying the original gain-2 versus gain-4 comparison.

## Same-Concept Check

This is the same concept because the task still asks for gain crossover, phase crossover, phase margin, and gain margin from the open-loop frequency response. The drone altitude loop changes the engineering surface, lag values, and margin target.
