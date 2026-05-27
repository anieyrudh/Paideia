# Biosensor Reporter Saturation

A diagnostic biosensor expresses a fluorescent reporter when an analyte is present. Its regulator has these parameters:

```text
alpha_0 = 0.02 per second             (basal transcription rate)
alpha_max = 0.6 per second            (maximum transcription rate)
k_tr = 1.2 per second per uM mRNA     (reporter production factor)
k_M = 0.08 per second                 (mRNA decay)
k_P = 0.04 per second                 (reporter-protein decay)
n = 3                                 (Hill coefficient)
K = 2.5 uM                            (half-max threshold)
```

## Step 1 - compare operating points

Compare `[I] = 2.5 uM` and `[I] = 8 uM`.

```latex
R = \frac{[I]^n}{K^n + [I]^n}
```

At threshold:

```latex
R_{2.5} = \frac{2.5^3}{2.5^3 + 2.5^3} = 0.5
```

At the high dose:

```latex
R_{8} = \frac{8^3}{2.5^3 + 8^3} \approx 0.97
```

## Step 2 - transcription rate

```latex
\alpha = \alpha_0 + (\alpha_{\max} - \alpha_0)R
```

```latex
\alpha_{2.5} = 0.02 + (0.6 - 0.02)(0.5) = 0.31\,s^{-1}
```

```latex
\alpha_{8} = 0.02 + (0.6 - 0.02)(0.97) \approx 0.583\,s^{-1}
```

## Step 3 - reporter steady states

Setting `dM/dt = 0` and `dP/dt = 0`:

```latex
M^* = \alpha / k_M
\qquad
P^* = k_{\text{tr}}M^*/k_P
```

```latex
M^*_{2.5} = 0.31/0.08 = 3.875\,\mu M
\qquad
P^*_{2.5} = 1.2(3.875)/0.04 = 116.25\,\mu M
```

```latex
M^*_{8} \approx 0.583/0.08 = 7.29\,\mu M
\qquad
P^*_{8} \approx 1.2(7.29)/0.04 = 218.7\,\mu M
```

## Interpretation

The inducer dose increased by `8 / 2.5 = 3.2x`, but reporter protein rose by only about `1.9x`. The high dose is close to the saturated plateau because `R` is already near 1, so additional inducer mostly nudges the reporter rather than scaling it proportionally.
