# Waning Immunity and Revaccination Cadence

A pathogen has `R0 = 5`. The herd-immunity threshold is `p* = 1 - 1/5 = 0.80`. The campaign vaccinated 90 percent of the population at day 0. Immunity wanes exponentially with rate `lambda = 0.005` per day.

## Step 1 — initial state

```text
R0 = 5
p0 = 0.90
p* = 0.80
Re(0) = R0 (1 - p0) = 5 * 0.10 = 0.50    (outbreak contained)
```

## Step 2 — coverage after 200 days

```latex
p(200) = 0.90 \cdot e^{-0.005 \cdot 200}
       = 0.90 \cdot e^{-1}
       \approx 0.331
```

The effective coverage has fallen well below `p*`.

## Step 3 — effective reproduction number after 200 days

```latex
R_e(200) = R_0\,(1 - p(200)) = 5 \cdot (1 - 0.331) \approx 3.34
```

`Re` has risen from 0.50 (contained) to 3.34 (rapidly growing).

## Step 4 — revaccination cadence

Solve for the day when `p(t)` falls to the threshold `p* = 0.80`:

```latex
0.80 = 0.90\,e^{-0.005 t}
\quad\Rightarrow\quad
t = \frac{\ln(0.90 / 0.80)}{0.005} \approx 23.5\,\text{days}
```

Even with very high initial coverage, the campaign must boost roughly every 24 days to stay above the threshold for this pathogen and this waning rate. Slower-waning vaccines or lower-R0 pathogens loosen the cadence; faster waning or higher R0 tightens it.

## Interpretation

The outbreak verdict changes from "contained" to "growing" purely from waning, not from any change in vaccine coverage at day 0. The waning rate, the threshold, and the booster schedule are the three knobs public-health planners can adjust; this is the introductory case for SIR-with-vaccination models.
