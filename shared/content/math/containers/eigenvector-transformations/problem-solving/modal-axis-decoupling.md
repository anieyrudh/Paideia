# Thermal Mode Transfer

A two-room heat model has patterns that can change size without changing shape.
One pattern warms both rooms together; another warms one room while cooling the
other. If a disturbance pattern keeps the same shape over time, it behaves like
an eigenvector.

## Expected reasoning

1. Identify the pattern as a direction in state space, not as a single room's temperature.
2. State the eigenvector criterion in words: after the system updates, the pattern must stay on the same line and only its size may change.
3. Interpret the eigenvalue as the growth or decay factor for that thermal mode over one update step.
4. Rule out the claim if the update changes the pattern's shape, such as moving heat into a different relative room balance rather than scaling the original pattern.

The transfer is successful when the learner can recognize preserved direction
without being handed a 2x2 matrix/vector multiplication.
