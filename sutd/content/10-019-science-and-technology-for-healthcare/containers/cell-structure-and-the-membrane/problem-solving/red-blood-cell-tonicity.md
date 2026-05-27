# Red Blood Cell Tonicity and Resting Voltage

A red blood cell is approximately a flattened disc, but for an introductory estimate treat it as a sphere with radius 4 micrometres. The bath surrounding the cell is plasma, with the textbook concentrations `[K+]_out = 4 mM`, `[Na+]_out = 145 mM`, `[Cl-]_out = 110 mM`. Inside the cell, `[K+]_in = 140 mM`, `[Na+]_in = 12 mM`, `[Cl-]_in = 10 mM`. The membrane in this example is K-dominant, with `P_K : P_Na : P_Cl ~ 1 : 0.04 : 0.45`.

## Step 1 — geometry

```latex
S = 4 \pi r^2 = 4 \pi (4 \times 10^{-6})^2 \approx 2.0 \times 10^{-10}\,\text{m}^2
\qquad
V = \tfrac{4}{3} \pi r^3 \approx 2.7 \times 10^{-16}\,\text{m}^3
\qquad
\text{SA:V} = 3 / r = 7.5 \times 10^{5}\,\text{m}^{-1}
```

A small cell has a high SA:V, which means the bath equilibrates with the cytoplasm relatively quickly. For a small ion with diffusion coefficient `D ~ 10^{-9} m^2/s`, the cell-radius-scale diffusion time `t = L^2 / (6 D) ~ (4e-6)^2 / 6e-9 ~ 2.7 ms` is very short compared to physiological timescales.

## Step 2 — per-ion Nernst potentials

```latex
E_K = (R T / F) \ln(4 / 140) \approx -94.7\,\text{mV}
\qquad
E_{Na} = (R T / F) \ln(145 / 12) \approx +66.6\,\text{mV}
\qquad
E_{Cl} = -(R T / F) \ln(110 / 10) \approx -64.1\,\text{mV}
```

(The chloride formula picks up a sign flip because `z_{Cl} = -1`.)

## Step 3 — GHK resting voltage

```latex
V_m \approx -70\,\text{mV}
```

The K-dominant permeability pulls the resting voltage close to `E_K = -94.7 mV`. The smaller but non-zero `P_{Cl}` pulls slightly toward `E_{Cl} = -64.1 mV`, and the tiny `P_{Na}` pulls slightly toward `+66.6 mV`. The result is around -70 mV.

## Step 4 — interpretation

In an isotonic bath the cell is at electrochemical steady state for this permeability profile. If the bath suddenly gained a much higher `[K+]_out` (hyperkalaemia), the K+ Nernst potential would move toward zero, and the resting voltage would depolarise. If the cell expressed more Na+ channels (raising `P_{Na}`), the resting voltage would move toward `+66.6 mV` — the start of an action potential.

The point of this problem is the role of **permeability**, not size: the small radius merely guarantees fast bath equilibration. The selectivity profile is what sets the voltage.
