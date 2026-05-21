---
subject: smt
concept: linear-system-stability
branch: sutd
level: "Undergraduate"
syllabus_ref: "SUTD SMT / mathematical modelling / systems of differential equations"
prerequisites:
  - ode-phase-portrait
  - vector-transformations
  - eigenvectors
aid_types:
  - simulation
  - misconception-audit
  - transfer-problem
status: reviewed
---

# Linear System Stability

## First-Principles Explanation

Picture a small disturbance from an operating point. The state starts as a dot
near the origin, and the rate arrows around it decide whether the dot is pulled
back, sent away, or made to rotate. Stability is therefore a local motion
question: do nearby paths shrink toward the operating point, or is there some
direction that grows?

A two-state linear model writes those arrows as `z' = A z`, where `z = (x, y)`
and `A = [[a, b], [c, d]]`. The eigenvalues of `A` are the natural growth rates
hidden inside the arrow field. Negative real eigenvalues settle. A positive real
eigenvalue gives an escaping direction. A complex pair rotates, while its real
part decides whether the rotation shrinks or grows.

## Key Definitions

- **Linear system**: a coupled rate model `z' = A z`.
- **State**: the pair `(x, y)` that records the two quantities being modelled.
- **Trace**: `T = a + d`, the sum of the diagonal entries.
- **Determinant**: `D = ad - bc`, which separates saddle cases from paired eigenvalue behaviour.
- **Discriminant**: `Delta = T^2 - 4D`, which separates real eigenvalues from a spiral pair.
- **Stable equilibrium**: nearby states eventually return toward the equilibrium.
- **Saddle**: one eigendirection returns while another escapes.

## Why This Matters

SMT models often begin nonlinear, then get linearised near an operating point.
The linearisation is useful because the eigenvalues quickly answer the practical
question: will a small perturbation die away, persist, or amplify? That decision
is central in control loops, reactors, motion models, and coupled population
models.

## Canonical Examples

- A damped oscillator has complex eigenvalues with negative real part, so it rotates inward.
- A stable node has two negative real eigenvalues, so it returns without rotating.
- A saddle has one negative and one positive real eigenvalue, so one direction escapes.
- An unstable spiral has complex eigenvalues with positive real part, so it rotates outward.

## Common Misconceptions

- Treating stable as "everything stops immediately" instead of eventual return.
- Checking only one eigenvalue and missing a second positive direction.
- Calling every rotating system stable without checking the real part.

## What The Student Does

The student predicts the default damped oscillator behaviour, adjusts the four
matrix coefficients and starting state, then reveals the stability class, phase
portrait, trajectory, formula substitution, units, and interpretation. The
transfer prompt moves the same eigenvalue reasoning to a control-loop operating
point.

## Pedagogical Choices And Why

- **Predict format**: multiple choice exposes the difference between settling,
  escaping, instant stopping, and growing rotation.
- **Manipulate variables**: presets give named behaviours, while coefficient
  sliders let students cross stability boundaries deliberately.
- **Observation**: the reveal keeps the trace, determinant, discriminant,
  eigenvalue substitution, and plotted path together so arithmetic and motion
  can be compared directly.
- **Transfer**: the control-loop prompt preserves the same matrix stability
  decision while changing the surface context.

## Misconceptions This Surfaces

- **Stable means every state stops moving instantly**: the vector field still
  has nonzero arrows away from the equilibrium, but the trajectory returns.
- **Only one eigenvalue matters**: the saddle preset shows that a single
  escaping eigendirection is enough to make the equilibrium unstable.

## Notes For The Teacher

Ask students to decide from `T`, `D`, and `Delta` before they inspect the plotted
path. Then ask which coefficient change would make the real part switch sign.
