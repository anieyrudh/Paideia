---
subject: esd
concept: newsvendor-critical-fractile
branch: sutd
level: "SUTD ESD"
syllabus_ref: "Stochastic optimisation / supply-chain inventory modelling"
prerequisites:
  - probability-distributions
  - expected-value
  - linear-programming-feasible-region
aid_types:
  - simulation
  - transfer-problem
  - misconception-audit
status: reviewed
---

# Newsvendor Critical Fractile

## First-principles explanation

A one-period seller has to choose stock before demand is known. Ordering too little creates shortage cost; ordering too much creates leftover cost. The critical fractile converts those two unit costs into a target cumulative probability, then chooses the smallest order quantity whose demand CDF reaches that target.

## Key definitions

- **Underage cost**: the cost of being short by one unit, such as lost margin or penalty.
- **Overage cost**: the cost of having one leftover unit, such as holding, disposal, or markdown loss.
- **Critical fractile**: the target service level `C_under / (C_under + C_over)`.
- **Service level**: the probability demand is no more than the chosen stock level, written as `F(Q)`.
- **Expected mismatch cost**: the probability-weighted shortage and leftover cost for a trial order quantity.

## Why this matters

Using mean demand as a stocking rule can be materially wrong when shortage and leftover costs are asymmetric. A medical kit, product launch, or event stall may rationally stock above the mean when a shortage is costly; a perishable item may rationally stock below the mean when leftovers are costly.

## Canonical examples

- A campus cafe chooses how many boxed lunches to prepare for a one-day event.
- A launch retailer chooses stock before demand is known and cannot reorder within the selling window.
- A festival vendor compares missed-sales cost with unsold-perishable cost.

## Common misconceptions

- **The optimal stock is always mean demand**: mean demand averages quantities, but the decision is set by asymmetric marginal costs.
- **A higher service level is always cheaper**: additional service reduces shortages but can create expensive leftovers.

## What the student does

The learner predicts the direction of the stocking target before reveal, then manipulates demand scenario, trial order, shortage cost, and leftover cost. The reveal shows a cost curve, demand probabilities, a formula panel with legend, substituted values, units, and an interpretation comparing the critical-fractile recommendation with mean-demand ordering.

## Pedagogical choices and why

- **Predict format**: multiple choice forces a falsifiable claim about direction: above mean, at mean, lowest order, or lower because service is expensive.
- **Manipulate variables**: demand shape, trial quantity, shortage cost, and leftover cost are exposed because each visibly changes the CDF crossing or expected-cost curve.
- **Transfer problem**: the lab-kit pop-up changes the surface story and demand grid while preserving the same cost-to-fractile reasoning.

## Misconceptions this surfaces

- **Optimal stock is always mean demand**: the default scenario has mean demand near 92 units while the critical fractile recommends 105 units, making the mismatch explicit.
- **Higher service level is always cheaper**: the leftover-sensitive preset lowers the target service level because extra stock creates more leftover penalty than shortage relief.

## Notes for the teacher

Ask students to say what one extra unit does at the margin: it avoids shortage only in high-demand states but creates leftover in low-demand states. This keeps the discussion grounded in cost balance rather than memorising a ratio.
