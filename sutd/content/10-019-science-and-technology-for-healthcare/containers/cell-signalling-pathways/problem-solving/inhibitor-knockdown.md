# Phosphatase Inhibitor Knockdown

Take the cascade `ligand -> receptor -> kinase -> transcription factor` with all activator weights at 1, plus a parallel phosphatase node feeding an inhibitor edge into the kinase with weight 1. Use thresholds `(0.1, 0.5, 0.5, 0.5)` and per-node sensitivity `k = 8`.

## Step 1 — baseline with the ligand at full strength

```text
ligand        = 1
receptor      = sigmoid(8 * (1 - 0.1))   ≈ 0.9994
kinase        = sigmoid(8 * (0.9994 - 0.5)) ≈ 0.973
tf            = sigmoid(8 * (0.973 - 0.5)) ≈ 0.978
```

The transcription factor is firmly "on".

## Step 2 — raise the phosphatase

The kinase's effective input now subtracts the phosphatase signal:

```text
input_kinase = activator * receptor - inhibitor * phosphatase
             = 1 * 0.9994 - 1 * 0.9 = 0.0994
kinase       = sigmoid(8 * (0.0994 - 0.5)) ≈ sigmoid(-3.2) ≈ 0.039
tf           = sigmoid(8 * (0.039 - 0.5)) ≈ sigmoid(-3.69) ≈ 0.024
```

The transcription factor is now "off" — even with the ligand at full strength.

## Step 3 — interpret

The phosphatase did not "subtract" 0.9 from the TF; it lowered the kinase's effective input by 0.9, which pushed the kinase below its threshold by 0.4. The logistic response is steep enough at `k = 8` that this 0.4 dip flips the kinase from `~1` to `~0`. The downstream TF inherits the off-state without any additional inhibitor.

This is the qualitative point of a saturating cascade: inhibitors do not just shave the output, they can switch downstream nodes off by lowering an effective input across a threshold.
