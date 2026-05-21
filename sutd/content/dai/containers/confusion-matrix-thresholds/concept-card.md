---
subject: dai
concept: confusion-matrix-thresholds
branch: sutd
level: "Freshmore"
syllabus_ref: "SUTD DAI / Human-centred AI decision thresholds"
prerequisites:
  - trust-calibration
  - probability
  - classification
aid_types:
  - simulation
status: reviewed
---

# Confusion Matrix Thresholds

## First-principles explanation

A classifier score is not yet a decision. A threshold turns the score into a
positive or negative prediction. Once the threshold is chosen, every case lands
in one of four cells: true positive, false positive, true negative, or false
negative. The confusion matrix is the accounting table that keeps those cells
visible.

Changing the threshold moves cases across the table. A stricter threshold often
reduces false positives but can create more false negatives. Whether that is
acceptable depends on the deployment: the two error types rarely carry the same
cost.

## Key definitions

- **Threshold**: the minimum model score needed to predict the positive class.
- **True positive (TP)**: predicted positive and actually positive.
- **False positive (FP)**: predicted positive but actually negative.
- **True negative (TN)**: predicted negative and actually negative.
- **False negative (FN)**: predicted negative but actually positive.
- **Precision**: TP / (TP + FP), the share of predicted positives that are correct.
- **Recall**: TP / (TP + FN), the share of actual positives that are found.
- **Stakeholder cost**: an explicit cost assigned to the two error cells.

## Why this matters

Thresholds turn statistical performance into a design decision. In a medical,
finance, safety, or moderation system, a high-accuracy threshold can still be
unacceptable if it misses the cases that matter most or burdens one stakeholder
with unnecessary interventions.

## Canonical examples

- A clinic triage model where false negatives miss urgent patients.
- A loan-review model where false positives delay eligible applicants.
- A moderation queue where the threshold trades missed harmful content against
  unnecessary human review.

## Common misconceptions

- Accuracy is enough for every deployment.
- A single threshold is neutral for all groups.

## What the student does

The student predicts the direction of the tradeoff, manipulates threshold and
error-cost controls, reveals the confusion matrix, then reads precision,
recall, accuracy, and cost with the formula and substituted values shown.

## Pedagogical choices and why

- **Predict format**: the prediction asks for a qualitative consequence of
  raising the threshold, because that surfaces the precision-recall tradeoff.
- **Manipulate variables**: threshold, false-negative cost, and false-positive
  cost are the policy levers a designer can justify.
- **Visual feedback**: cases are shown as score chips, a confusion matrix, and a
  threshold curve so learners see counts move before interpreting metrics.
- **Transfer problem**: loan review changes the surface story while preserving
  threshold, count update, and cost interpretation.

## Misconceptions this surfaces

- **Accuracy is enough for every deployment**: the simulation can show a
  threshold with acceptable accuracy but a higher stakeholder cost because it
  misses expensive positives.
- **A single threshold is neutral for all groups**: the transfer discussion asks
  learners to check whether the same threshold has the same meaning when group
  base rates, score distributions, or error costs differ.

## Notes for the teacher

Ask students to defend a threshold for a named stakeholder. The best answer is
not always the threshold with the highest precision or accuracy; it is the one
whose error pattern is appropriate for the deployment context.
