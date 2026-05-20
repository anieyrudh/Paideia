---
subject: freshmore
concept: bayes-updating
branch: sutd
level: "Freshmore"
syllabus_ref: "SUTD Freshmore / Probability and Statistics"
prerequisites:
  - basic-probability
  - confusion-matrix-basics
aid_types:
  - simulation
status: draft
---

# Bayes Updating

## First-principles explanation

Trusting a model is a decision, not a feeling. A confidence score says how sure
the model claims to be; calibration asks whether that confidence matches how
often it is actually right. A useful policy compares confidence with the cost
of being wrong and the cost of asking a human to review the case.

## Key definitions

- **Confidence**: the model's stated probability-like score for its own recommendation.
- **Calibration**: the match between confidence and observed correctness.
- **Threshold**: the minimum confidence needed before automation acts without review.
- **Expected cost**: the average penalty of a policy after weighting mistakes and reviews.

## Why this matters

A model with high overall accuracy can still be unsafe if its mistakes are
concentrated in expensive cases. Trust calibration makes students quantify the
tradeoff instead of accepting or rejecting automation as a slogan.

## Canonical examples

- A triage model that auto-clears low-risk cases only above a confidence threshold.
- A moderation system that sends uncertain cases to human review because false negatives are costly.

## Common misconceptions

- Confidence equals correctness.
- Accuracy is the only metric.

## What the student does

The student predicts which threshold will work best, adjusts threshold and cost
settings, then reveals coverage, accepted-case risk, review count, and total
expected cost with the formula shown.

## Pedagogical choices and why

- **Predict format**: multiple choice over thresholds, because the answer can be
  falsified by a concrete cost calculation.
- **Manipulate variables**: threshold, wrong-decision cost, and review cost are
  exposed because they are the core policy levers.
- **Transfer problem**: clinic triage changes the surface context while keeping
  the same threshold-plus-cost reasoning.

## Misconceptions this surfaces

- **Confidence equals correctness** — the accepted cases still carry an expected
  error risk even at high confidence.
- **Accuracy is the only metric** — the total-cost formula can prefer more human
  review when wrong automated decisions are expensive.

## Notes for the teacher

Ask students to compare two policies with the same expected accuracy but
different costs. The goal is not to pick the highest threshold by default; it is
to justify the trust boundary with evidence.
