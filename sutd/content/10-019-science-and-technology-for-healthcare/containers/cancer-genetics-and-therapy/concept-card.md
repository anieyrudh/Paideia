---
subject: 10-019-science-and-technology-for-healthcare
concept: cancer-genetics-and-therapy
branch: sutd
level: Freshmore
syllabus_ref: SUTD 10.019 Science and Technology for Healthcare / Cancer genetics and therapy
prerequisites:
  - cell-cycle-and-mitosis-meiosis
  - hill-activation-function
aid_types:
  - simulation
  - misconception-audit
  - transfer-problem
status: draft
---

# Cancer Genetics and Therapy

This container is **educational only**. It demonstrates two closed-form models that recur across introductory cancer biology and pharmacology. It does not diagnose, predict patient outcomes, or recommend treatment.

The first model is **clonal growth driven by driver mutations**. A driver mutation is a genetic change that raises the per-generation fitness of the cell carrying it. Passenger mutations are along for the ride; they do not directly raise fitness. If a clone has `k` drivers each with per-driver advantage `s`, its relative fitness compared to the wild-type baseline is

```latex
F = (1 + s)^k
```

Iterated over `g` generations starting from a population of size `N`, the clone size grows multiplicatively:

```latex
N(g) = N \cdot F^g = N \cdot ((1 + s)^k)^g
```

The second model is the **Hill dose-response curve**. A therapy with IC50 `K`, Hill coefficient `n`, and dose `d` produces a response fraction

```latex
R(d) = \frac{d^n}{K^n + d^n}
```

The dose required for a target response `R*` is the inverse,

```latex
d^* = K \cdot \left(\frac{R^*}{1 - R^*}\right)^{1/n}
```

A **resistance factor** `f >= 1` multiplies the effective IC50:

```latex
K_{\text{eff}} = f \cdot K_{\text{base}}
```

Larger `f` lifts the effective IC50 and pushes the required dose higher. The **therapeutic index** `TI = toxicDose / effectiveDose` measures how much headroom exists between an effective dose and a toxic one; resistance erodes that headroom.

## First-Principles Explanation

Driver mutations compound. A single driver multiplies fitness by `1 + s`; the cell with two drivers carries `(1 + s)^2`; with `k` drivers, `(1 + s)^k`. Over `g` generations the size multiplies by `F^g`. Even small `s` like 0.1 compounds dramatically: three drivers over twenty generations gives `F = (1.1)^3 = 1.331`, so the relative size is `1.331^20 \approx 304x`. From a starting size of 10, that is about 3045 cells versus 10 baseline cells.

The Hill dose-response curve says response is sigmoidal in dose. Near zero, response is roughly proportional to `d^n / K^n`. At `d = K`, response is exactly 0.5. Above `d = K`, response saturates toward 1. Resistance shifts the entire curve to the right by a factor `f`; the dose to reach the same `R*` scales by the same `f`.

## Canonical Example

A clone with 3 drivers and `s = 0.1` starts at size 10 and grows for 20 generations: final size `10 * (1.1)^60 \approx 3045`. A passenger-only clone of the same starting size stays near 10 in this simplified comparison, so the ratio is roughly 304x baseline. The driver-driven clone dominates.

A therapy with IC50 = 10 and `n = 2` reaches 90 percent response at `d* = 10 * sqrt(0.9 / 0.1) = 30`. A resistance factor of 4 lifts the effective IC50 to 40, so the same 90 percent response now needs `d* = 40 * sqrt(9) = 120`. If the toxic dose is 60, the therapeutic index `TI = toxicDose / d* = 60/30 = 2` is reasonable in the susceptible case but `TI = 60/120 = 0.5` is no longer above 1 in the resistant case — the dose required for response exceeds the toxic dose.

## Common Misconceptions

- "More drivers immediately kill cells." Drivers raise fitness; cells with more drivers grow faster, not die faster.
- "Higher dose always works." Resistance lifts the IC50; the dose required can exceed the toxic dose, collapsing the therapeutic window.
- "Driver and passenger mutations are equally important." Drivers compound fitness; passengers do not (in this model).
- "A clone with zero drivers cannot grow." It still divides at the baseline rate; it just does not outpace other clones.

## Transfer

The same closed-form models underlie the introductory framing for evolutionary dynamics of tumour heterogeneity, drug-screening dose-response curves, and the rationale for combination therapy (multiple drugs with different resistance profiles to broaden the effective therapeutic window). Each downstream application is an active research area; the introductory model is enough to discuss qualitative trade-offs.
