---
subject: 10-022-modelling-uncertainty
concept: joint-and-marginal-distributions
branch: sutd
level: "SUTD 10.022"
syllabus_ref: "SUTD 10.022 Modelling Uncertainty / Joint and Marginal Distributions"
prerequisites:
  - probability-distributions
  - conditional-probability
aid_types:
  - simulation
  - transfer-problem
  - misconception-audit
title: "Joint and Marginal Distributions"
status: reviewed
---

# Joint and Marginal Distributions

A joint distribution records probabilities for combinations of events. In a 2x2
table, each interior cell is a joint probability such as `P(A and B)`.

A marginal probability is a row or column total. For example, `P(A)` is the sum
of all cells where event A occurs. A conditional probability changes the
denominator: `P(A|B)=P(A and B)/P(B)`.

The main trap is denominator drift. A joint cell, a marginal total, and a
conditional probability can all be about the same events but answer different
questions.
