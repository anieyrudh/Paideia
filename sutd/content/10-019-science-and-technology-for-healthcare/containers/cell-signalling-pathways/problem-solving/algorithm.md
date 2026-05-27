# Problem-Solving Algorithm

1. List the nodes of the cascade with their thresholds and the per-node sensitivity `k`.
2. List the edges, marking each as activator or inhibitor with a weight.
3. Confirm the graph is acyclic; if not, switch to a time-resolved integration kernel.
4. Topologically sort the nodes (sources first, sinks last).
5. For each non-source node `i`, compute the effective input `input_i = sum(w * x_upstream over activators) - sum(w * x_upstream over inhibitors)`.
6. Apply the logistic response `y_i = 1 / (1 + exp(-k * (input_i - theta_i)))` and clamp to `[0, 1]`.
7. Read the sink-node value as the cascade output. Interpret in plain language: is it "on", "off", or in the steep transition band?
8. Repeat with a perturbed input (e.g. doubled ligand or raised inhibitor) to characterise the response surface.
