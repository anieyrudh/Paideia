---
subject: esd
concept: markov-chain-steady-state
branch: sutd
level: "SUTD ESD"
syllabus_ref: "SUTD ESD stochastic modelling / Markov chains and steady-state analysis"
prerequisites:
  - probability-distributions
  - matrix-multiplication
  - eigenvectors
aid_types:
  - simulation
  - transfer-problem
  - misconception-audit
status: reviewed
---

# Markov Chain Steady State

## First-principles explanation

A Markov chain describes a system whose next state depends on its current state
and a transition rule. In ESD, that rule can describe a queue that is smooth or
congested, a machine that is up or down, or a customer who is active or dormant.
The steady state answers a long-run planning question: if the same transition
pattern keeps repeating, what fraction of time should the system spend in each
state?

## Key definitions

- **State vector**: a probability distribution over the possible states at one
  time step.
- **Transition matrix**: a table of conditional probabilities that maps the
  current state mix to the next state mix.
- **Steady state**: a state vector pi where one more transition leaves the
  vector unchanged, so pi = P pi.
- **Regular chain**: a Markov chain that eventually mixes toward one long-run
  distribution from any starting mix.

## Why this matters

Short-run forecasts answer "what happens next week?" Steady-state analysis
answers "what operating mix should we plan capacity around if this policy keeps
running?" Confusing the two can overbuild for a transient condition or
understaff a state that repeatedly receives inflow.

## Canonical examples

Suppose a weekly operations process is smooth 84% of the time if it was smooth
last week. If it was congested, it recovers to smooth 38% of the time. With a
column state vector, the transition matrix is:

```text
P = [[0.84, 0.38],
     [0.16, 0.62]]
```

The steady-state smooth probability is:

```text
pi_S = P(S next | C now) / (P(S next | C now) + P(C next | S now))
     = 0.38 / (0.38 + 0.16)
     = 0.704
```

The long-run interpretation is: after many weeks, about 70.4% of weeks are
smooth and 29.6% are congested, even though individual weeks still switch
states.

## Common misconceptions

- **"Steady" means frozen.** A steady distribution can coexist with constant
  switching because the flows balance in aggregate.
- **The largest one-step arrow wins.** Long-run share depends on both staying
  probability and recovery probability, not just the largest cell in the matrix.
- **The initial mix determines the final mix.** In a regular two-state chain,
  the initial mix affects the path, but the same transition matrix determines
  the eventual steady state.

## What the student does

The learner predicts whether sticky congestion should dominate the long run,
then manipulates a two-state transition matrix. The reveal shows repeated state
updates, the eigenvector/closed-form steady-state result, a color-coded legend,
and a convergence chart.

## Pedagogical choices and why

- **Predict format**: multiple choice forces a falsifiable long-run direction
  before the chart or formula is visible.
- **Manipulate variables**: the learner controls the two independent transition
  probabilities, the initial mix, and the forecast horizon. The complementary
  probabilities are computed so each column remains a valid probability
  distribution.
- **Transfer problem**: the service backlog surface uses the same matrix update
  and steady-state equation in a different operations context.

## Misconceptions this surfaces

- **Steady state means no individual transitions happen**: the simulation keeps
  one-step flows visible so students can see movement persists at equilibrium.
- **The largest immediate transition always dominates long-run state**: changing
  recovery probability can flip the steady mix even when a stay probability is
  the largest single entry.

## Notes for the teacher

Ask students to explain the direction of net flow before revealing the closed
form. If they focus only on the largest matrix entry, point them back to the two
off-diagonal probabilities because those govern the steady-state balance in a
two-state chain.
