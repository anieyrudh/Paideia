# Lac-Operon-Style Induction

A lac-operon-style promoter has the following parameters:

```text
alpha_0 = 0.01 per second      (basal transcription rate)
alpha_max = 1 per second       (maximum transcription rate)
k_tr = 2 per (uM second)       (translation rate per mRNA)
k_M = 0.1 per second           (mRNA decay)
k_P = 0.05 per second          (protein decay)
n = 2                          (Hill coefficient)
K = 1 uM                       (half-max threshold)
```

## Step 1 — choose an operating point

Set the inducer concentration to threshold: `[I] = K = 1 uM`.

```latex
R = \frac{[I]^n}{K^n + [I]^n} = \frac{1^2}{1^2 + 1^2} = 0.5
```

## Step 2 — instantaneous transcription rate

```latex
\alpha = \alpha_0 + (\alpha_{\max} - \alpha_0) R = 0.01 + (1 - 0.01) \cdot 0.5 = 0.505\,\text{per second}
```

## Step 3 — mRNA steady state

Setting `dM/dt = 0`:

```latex
M^* = \alpha / k_M = 0.505 / 0.1 = 5.05\,\mu\text{M}
```

## Step 4 — protein steady state

Setting `dP/dt = 0`:

```latex
P^* = k_{\text{tr}} M^* / k_P = 2 \cdot 5.05 / 0.05 = 202\,\mu\text{M}
```

## Interpretation

At the threshold inducer the cell sits at the steepest part of the Hill curve, so small changes in `[I]` produce large changes in protein level. Doubling the inducer to 2 uM gives `R = 4 / (1 + 4) = 0.8`, so `alpha = 0.802`, `M* = 8.02`, `P* = 320.8` — about 1.6× more protein, not 2×. Above 5 uM the Hill curve is essentially saturated and additional inducer barely moves the steady states. The pedagogical point is that the protein response is sigmoidal in inducer, with a saturating plateau set by `alpha_max` divided by the decay constants.
