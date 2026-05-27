# Disinfection Window Shift

This transfer problem uses the same multiplicative-growth and Hill-response ideas in a non-clinical surface. It is an educational model only.

## Step 1 - contaminant growth after 15 generations

```latex
F = (1 + 0.08)^2 \approx 1.1664
\qquad
N(15) = 50 \cdot 1.1664^{15} \approx 50 \cdot 10.0 \approx 500
```

A neutral subpopulation over the same 15 generations has `F = 1` and final size 50. The advantageous contaminant is about `10x` larger.

## Step 2 - dose for 90 percent response without resistance

```latex
d^* = 8 \cdot \left(\frac{0.9}{0.1}\right)^{1/2}
     = 8 \cdot 3
     = 24
```

## Step 3 - dose for 90 percent response with resistance factor f = 3

```latex
IC50_{\text{eff}} = 3 \cdot 8 = 24
\qquad
d^* = 24 \cdot 3 = 72
```

The required dose scaled by exactly `f = 3` because the Hill inverse is proportional to `IC50_eff` for a fixed target response.

## Step 4 - safety window

The safety dose is 40. Without resistance, `40 / 24 = 1.67`, so the target response is below the safety limit. With resistance, `40 / 72 = 0.56`, so the required dose exceeds the safety limit.

## Interpretation

Two separate multipliers matter:

- beneficial mutations compound the contaminant population before treatment;
- resistance shifts the response curve to the right, so the same target response requires a proportionally larger dose.

That is the transfer target: growth and response are different curves, but both are multiplicative.
