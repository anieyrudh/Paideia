# Misconception Map

## Stable means every state stops moving instantly

Surface in predict? yes

Evidence: Strogatz, *Nonlinear Dynamics and Chaos*, fixed-point stability
chapters.

Correction: stability is about what nearby states do over time. A point away
from the equilibrium can have a nonzero rate and still return toward the
equilibrium.

Simulation hook: the default damped oscillator shows nonzero arrows around the
origin while the sampled trajectory spirals inward.

## Only one eigenvalue matters

Surface in predict? yes

Evidence: Hirsch, Smale, and Devaney, linear systems chapters.

Correction: a two-state system has two eigenvalues or one complex pair. A
single positive real eigenvalue, or a positive real part, is enough to create
local instability.

Simulation hook: the saddle preset reveals one settling direction and one
escaping direction, then checks a real eigendirection against the matrix.
