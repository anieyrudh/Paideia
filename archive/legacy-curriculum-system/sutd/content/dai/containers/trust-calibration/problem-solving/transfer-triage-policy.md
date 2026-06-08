# Transfer Problem: Triage with Human Override

A clinic uses a fixed binary-risk model to prioritize follow-up calls.

- If the model predicts **positive**, staff call immediately.
- False negative cost = **8 units** (missed urgent case).
- False positive cost = **2 units** (unneeded escalation).
- Human review for uncertain cases costs **1 unit per reviewed case**.

Use the confidence bins from the simulation to propose a threshold and override band. Show your total expected cost and justify your policy.

## Rubric

- **Policy clarity (2):** threshold and override rule are explicit.
- **Cost accounting (4):** includes FP, FN, and review costs with correct signs and units.
- **Calibration reasoning (2):** uses confidence versus observed accuracy, not confidence alone.
- **Decision quality (2):** recommendation is coherent with computed totals and risk priorities.
