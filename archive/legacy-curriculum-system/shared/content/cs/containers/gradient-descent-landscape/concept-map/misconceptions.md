# Misconception Map

## Bigger learning rate is always faster

- **Evidence:** Goodfellow, Bengio, and Courville note that step size controls stability as well as speed; too large a learning rate can make optimization fail to reduce the objective.
- **Surface in predict?** yes
- **Correction:** A large learning rate can overshoot steep directions and leave the useful domain, especially in narrow ravines.

## Local slope reveals the global minimum

- **Evidence:** Boyd and Vandenberghe frame descent methods as local iterative methods; the local gradient supports the next step, not a full global map of the objective.
- **Surface in predict?** no
- **Correction:** The gradient gives the local direction of steepest increase. Descent uses the opposite local direction, and the full path depends on landscape curvature and step size.

## Small gradient always means convergence

- **Evidence:** Goodfellow, Bengio, and Courville discuss plateaus, saddle points, and poor conditioning as optimization difficulties; a small gradient alone is not a proof of a useful global optimum.
- **Surface in predict?** no
- **Correction:** A small gradient can also appear near saddle regions or flat plateaus. The trace, loss value, and landscape context must be interpreted together.
