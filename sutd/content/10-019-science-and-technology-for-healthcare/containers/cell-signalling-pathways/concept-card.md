---
subject: 10-019-science-and-technology-for-healthcare
concept: cell-signalling-pathways
branch: sutd
level: Freshmore
syllabus_ref: SUTD 10.019 Science and Technology for Healthcare / Cell signalling pathways
prerequisites:
  - cell-structure-and-the-membrane
  - hill-activation-function
aid_types:
  - simulation
  - misconception-audit
  - transfer-problem
status: draft
---

# Cell Signalling Pathways

A signalling cascade is a small directed graph of molecular components. An external **ligand** binds a membrane **receptor**; the receptor activates an intracellular **kinase**; the kinase activates a **transcription factor** that changes gene expression. Each edge is either an activator or an inhibitor, and each node responds **saturatingly** to its incoming inputs — there is a threshold, a steep middle region, and a flat plateau.

A standard introductory abstraction models every node's response with the logistic function

```latex
y_i = \frac{1}{1 + e^{-k(\text{input}_i - \theta_i)}}
```

where `theta_i` is the node's threshold (where the response is 0.5) and `k` is the sensitivity (how steep the switch is). The effective input is the sum of activator weights minus the sum of inhibitor weights from the upstream nodes:

```latex
\text{input}_i = \sum_{j \to i,\, \text{activator}} w_{ji} x_j \;-\; \sum_{j \to i,\, \text{inhibitor}} w_{ji} x_j
```

Propagating a single ligand signal along a four-stage cascade therefore yields a smoothly sigmoidal transcription-factor response: steepest near the receptor's threshold, flat above it, and never linear in ligand concentration.

## First-Principles Explanation

Saturation is the kernel idea. A single saturating stage gives a sigmoid. Stacking saturating stages keeps the output bounded but can sharpen the apparent threshold (cascades of `n = 1` Hill stages can mimic higher-cooperativity behaviour). Inhibitor edges enter as negative weights into the effective input; raising an inhibitor pulls the effective input below the threshold and can switch a downstream node from "on" to "off" abruptly.

The pathway must be acyclic to settle in one synchronous propagation step. Cycles require time-resolved integration; here we stay at the deterministic steady-state view appropriate for an introductory survey.

## Canonical Example

Take the cascade `ligand -> receptor -> kinase -> transcription factor` with every edge an activator of weight 1, every node a logistic with `k = 8`, and thresholds `0.1, 0.5, 0.5, 0.5`. Setting the ligand to 1 gives a receptor output near 1 (well above its 0.1 threshold), which gives kinase output near 1, which gives transcription-factor output near 1. Dropping the ligand to 0 gives the chain output near 0. The transition is sharp — a small change in ligand near the receptor threshold flips the whole downstream chain.

Adding an inhibitor edge from a parallel phosphatase to the kinase moves the kinase's effective input down by the phosphatase signal weight. Even with the ligand at 1, a strong phosphatase signal can keep the kinase below threshold and the transcription factor off.

## Common Misconceptions

- "Cascade responses are linear in ligand." They are sigmoidal; the middle of the curve is steep and the ends are flat.
- "Inhibitors merely subtract from the output." Inhibitors enter the *input* to a saturating response; they can flip the downstream verdict, not just shave it.
- "All edges have equal weight." Weights are biologically meaningful and shift where the threshold effectively sits.
- "Cycles work the same as DAGs." Cyclic networks need time-resolved integration; the synchronous DAG view is wrong for feedback.

## Transfer

The same cascade view shows up in MAPK signalling, GPCR responses, and synthetic-biology circuits like toggle switches and band-pass filters. Each downstream container picks up a richer flavour (ODE integration, stochastic single-molecule events, or feedback loops) on top of the same saturating-DAG core.
