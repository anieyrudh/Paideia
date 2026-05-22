# Transfer: Thermal Loop Retune

A thermal chamber has a slower sensor than the training plant. The baseline loop is stable but too slow. Retune the PID gains so the response stays below 15% overshoot while phase margin remains at least 35 degrees.

## Rubric

- Identifies the open loop \(L(s)=C(s)G(s)\) before closing feedback.
- Uses the step response to report overshoot and final error with units or percentages.
- Uses the Bode response to report phase margin in degrees and crossover in rad/s.
- Explains why the slower sensor reduces robustness.
- Chooses gains that balance response speed against phase margin instead of maximizing one gain.
