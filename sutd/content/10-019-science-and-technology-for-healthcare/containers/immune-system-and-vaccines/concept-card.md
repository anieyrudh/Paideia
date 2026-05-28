---
subject: 10-019-science-and-technology-for-healthcare
concept: immune-system-and-vaccines
branch: sutd
level: Freshmore
syllabus_ref: SUTD 10.019 Science and Technology for Healthcare / Immune system and vaccines
prerequisites:
  - hill-activation-function
  - probability-fractions
aid_types:
  - simulation
  - misconception-audit
  - transfer-problem
status: draft
---

# Immune System and Vaccines

The adaptive immune system recognises pathogens through **antigen-antibody match**. An antibody's variable region pairs with an antigen epitope; the match score is graded, not binary. Strong matches drive efficient neutralisation; partial matches still bind, just less effectively.

Population-scale outbreak dynamics distil to a single quantity, the **effective reproduction number** `Re`. If `R0` is the basic reproduction number (how many new infections one infectious individual generates in a fully susceptible population), and `p` is the fraction with effective immunity (vaccinated or recovered), then:

```latex
R_e = R_0\,(1 - p)
```

The **herd-immunity threshold** is the smallest `p` that drops `Re` to 1:

```latex
p^* = 1 - \tfrac{1}{R_0}
```

Vaccines push `p` up. Waning of vaccine-induced immunity over time lowers the effective `p` exponentially:

```latex
p(t) = p_0\,e^{-\lambda t}
```

A booster dose restores `p` toward 1 with a Hill-shaped curve in the dose.

## First-Principles Explanation

The herd-immunity formula comes from setting `Re = 1`: one infectious person seeds exactly one new infection on average. Above `Re = 1` the outbreak grows; below, it shrinks. The threshold scales inversely with `R0`: more transmissible pathogens need higher coverage. Measles (`R0 ~ 15`) requires `p* ~ 93%`; SARS-CoV-2 variants with `R0 ~ 5` require `p* ~ 80%`.

The antigen-antibody match is a sequence-similarity metric. Two epitopes that agree at most positions bind tightly; one substitution drops the score a small amount; a viral variant with many epitope changes can escape neutralisation entirely.

## Canonical Example

A pathogen has `R0 = 4`. The herd-immunity threshold is `1 - 1/4 = 0.75`. Vaccinating 60 percent of the population gives `Re = 4 * (1 - 0.6) = 1.6`. The outbreak still grows; vaccinating another 15 percent crosses the threshold and brings `Re` to 1. Waning of half the vaccinated population's immunity to 0.5 gives an effective `p = 0.75 * 0.5 + 0.75 * 0.5 = 0.5625`, and `Re = 4 * (1 - 0.5625) = 1.75`. A booster restores high `p`; the cadence of boosters trades off against the waning rate.

## Common Misconceptions

- "Any vaccination coverage stops an outbreak." Only coverage above the herd-immunity threshold drops `Re` below 1.
- "Antigen-antibody specificity is binary." Match score is graded; partial matches still bind weakly.
- "Once vaccinated, immunity never wanes." Vaccine-induced immunity decays exponentially; the decay rate is pathogen- and vaccine-specific.
- "Herd immunity protects the unvaccinated forever." If coverage drops below `p*` (waning, declined boosters, immigration), the outbreak can restart.

## Transfer

The same `Re = R0 (1 - p)` framing applies to school-based interventions, mask mandates, and pre-exposure prophylaxis. The antigen-antibody match underlies vaccine-strain selection for influenza and SARS-CoV-2 variants. Both translate directly into the SIR / SEIR / SIRV models taught later, where the population's compartmental dynamics replace the static `Re`.
