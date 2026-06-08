# Bayes Updating Misconception Map

## A positive result means the hypothesis is likely true

**Why it appears:** Learners often focus on the positive result and ignore how rare the original hypothesis was.

**Evidence:** OpenIntro Statistics, conditional probability and Bayes' theorem sections.

**Surface in predict?** yes

**Correction target:** Compare the true-positive route with the false-positive route before interpreting the posterior.

## Sensitivity alone determines the posterior

**Why it appears:** `P(+ | H)` is easier to read than `P(H | +)`, so students can reverse the condition by accident.

**Evidence:** OpenIntro Statistics, conditional probability and Bayes' theorem sections.

**Surface in predict?** yes

**Correction target:** Name the prior, sensitivity, specificity, and false-positive route before calculating the posterior.

## Specificity does not matter after a positive result

**Why it appears:** A positive-result question can make the negative-result definition `P(- | not H)` look irrelevant.

**Evidence:** Khan Academy Bayes' theorem and conditional probability examples.

**Surface in predict?** yes

**Correction target:** Convert specificity into the false-positive rate `P(+ | not H)` and include it in the denominator.
