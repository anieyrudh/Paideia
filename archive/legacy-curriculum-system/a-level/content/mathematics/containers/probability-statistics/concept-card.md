---
subject: mathematics
concept: probability-statistics
branch: a-level
level: "H2"
syllabus_ref: "9758 / Probability and Statistics"
prerequisites:
  - algebra
  - functions
aid_types:
  - simulation
  - misconception-audit
  - transfer-problem
status: reviewed
---

# Probability and Statistics

## First-Principles Explanation

Probability gives weights to possible outcomes. Statistics asks what a sample says about the process that produced it. The bridge is a random variable: once each outcome has a value and a probability, the mean, variance, and test statistic become disciplined summaries rather than guesses from a single result.

## Key Definitions

- **Random variable**: a numerical value assigned to each outcome of a random process.
- **Probability distribution**: the list of possible values of a random variable and their probabilities.
- **Expected value**: the long-run weighted average, found by multiplying each value by its probability and adding the products.
- **Variance**: the probability-weighted average squared distance from the expected value.
- **Null hypothesis**: the model being tested, usually a statement that the process mean has not changed.
- **Test statistic**: a standardised measure of how far the observed sample sits from the null model.

## Why This Matters

Without the distribution, a student may mistake the most common outcome for the expected value. Without variance and sample size, a student may treat a small class sample as conclusive evidence. A-Level probability and statistics depends on keeping centre, spread, and evidence separate.

## Canonical Examples

- A three-outcome score game where 0, 4, and a high-score prize have different probabilities.
- A sample mean compared with a null expected score using a standard error.
- A distribution that keeps a similar mean while becoming much more variable.

## Common Misconceptions

- Expected value is not necessarily the most likely value.
- A rare high outcome can change spread even when the expected value changes only a little.
- A hypothesis-test decision depends on the difference from the null mean, the spread, and the sample size.

## What The Student Does

The student predicts how a rare high outcome affects a distribution, manipulates outcome weights and sample size, then reveals the expected value, variance, z-score, and decision. The formula panel keeps the LaTeX source, colour legend, substitution, units, and interpretation visible in one place.

## Pedagogical Choices And Why

- **Predict format**: a multiple-choice claim about expected value and spread forces a falsifiable choice before the formula panel appears.
- **Manipulate variables**: weights, high-score value, observed mean, and sample size are exposed because they map directly to distribution normalisation, E(X), Var(X), and the z-score standard error.
- **Transfer problem**: a fundraiser prize game changes the surface while preserving the same random-variable and sample-mean reasoning.

## Misconceptions This Surfaces

- **Expected value is the most likely outcome**: a weighted mean can sit between or away from listed outcomes; OpenStax treats expected value as a long-run average.
- **A hypothesis-test decision depends only on the observed mean**: changing sample size with the same observed mean changes the standard error and therefore the z-score.
- **Independent and mutually exclusive mean the same thing**: this container links forward to event logic so learners do not blur probability structures before inference.

## Notes For The Teacher

Use the sim after students have met discrete random variables and before formal hypothesis testing. Ask students to explain why the same observed mean can fail to reject for a small sample and reject for a larger sample.
