# Paracrine Growth-Factor Threshold

A wound-healing assay uses a paracrine growth-factor cascade:

```text
growth factor -> receptor -> kinase -> transcription factor
```

There is no phosphatase branch in this transfer problem. Instead, the receptor-to-kinase edge is weak:

```text
growth-factor input = 0.4 or 1.0
receptor threshold = 0.1
kinase threshold = 0.5
transcription-factor threshold = 0.5
receptor -> kinase weight = 0.4
all other weights = 1
sensitivity k = 8
```

## Step 1 - low growth-factor condition

For growth factor `0.4`, the receptor is mostly on because the input is above its threshold:

```latex
R \approx \sigma(8(0.4 - 0.1)) = \sigma(2.4) \approx 0.92
```

The kinase sees only `0.4R` because the middle edge is weak:

```latex
K_{\text{in}} \approx 0.4(0.92) = 0.37
```

```latex
K_{\text{out}} \approx \sigma(8(0.37 - 0.5)) = \sigma(-1.04) \approx 0.26
```

The transcription factor is off because the kinase output is below its threshold.

## Step 2 - high growth-factor condition

For growth factor `1.0`, the receptor saturates:

```latex
R \approx \sigma(8(1.0 - 0.1)) \approx 1.00
```

But the kinase input is still bounded by the weak edge:

```latex
K_{\text{in}} \approx 0.4(1.00) = 0.40
```

```latex
K_{\text{out}} \approx \sigma(8(0.40 - 0.5)) = \sigma(-0.8) \approx 0.31
```

## Interpretation

Adding more growth factor barely helps once the receptor is saturated. The middle edge is the bottleneck: it caps the kinase input below the kinase threshold. This is the transfer point from the main sim: a cascade can fail downstream even when the upstream signal is strong, because weighted edges and thresholds decide what each node actually sees.
