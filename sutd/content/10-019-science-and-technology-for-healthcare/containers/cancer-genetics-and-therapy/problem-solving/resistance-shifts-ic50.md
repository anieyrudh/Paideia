# Resistance Shifts the Effective IC50

This is an educational illustration, not a clinical recommendation.

A clone has `k = 3` drivers with per-driver advantage `s = 0.1`, starting size `N = 10`. A therapy has base `IC50 = 10` and Hill coefficient `n = 2`. The therapy is paired with an evolving resistance factor `f`.

## Step 1 — clone size after 20 generations

```latex
F = (1 + 0.1)^3 \approx 1.331
\qquad
N(20) = 10 \cdot 1.331^{20} \approx 10 \cdot 3050 \approx 30500
```

A passenger-only clone (`k = 0`) over the same 20 generations has `F = 1` and final size 10. The driver-bearing clone is ~3000-fold larger.

## Step 2 — therapy dose for 90 percent response, no resistance

```latex
d^* = 10 \cdot \left(\frac{0.9}{0.1}\right)^{1/2}
     = 10 \cdot \sqrt{9}
     = 30
```

## Step 3 — therapy dose for 90 percent response, resistance factor f = 4

```latex
IC50_{\text{eff}} = 4 \cdot 10 = 40
\qquad
d^* = 40 \cdot \sqrt{9} = 120
```

The dose required for the same response level scaled by exactly `f = 4`. This is a general consequence of the Hill inverse: a multiplicative shift in `IC50` shifts the required dose by the same factor for any target `R*`.

## Step 4 — therapeutic index

Suppose the toxic dose is 60. Without resistance, `TI = 60 / 30 = 2` — there is headroom. With resistance, `TI = 60 / 120 = 0.5` — the dose required to reach 90 percent response exceeds the toxic dose; the therapeutic window has closed at this resistance level.

## Interpretation

Two qualitative lessons:

- Drivers compound growth, so the population at risk under therapy is exponentially larger than a passenger-only clone.
- Resistance lifts the effective `IC50` proportionally. Past a critical resistance, the dose for a target response exceeds the toxic dose and the therapeutic window collapses.

The introductory remedy in real pharmacology is **combination therapy**: drugs with different resistance profiles broaden the effective window. This kernel is enough to make that argument qualitative; the actual clinical decision is far more complex and out of scope here.
