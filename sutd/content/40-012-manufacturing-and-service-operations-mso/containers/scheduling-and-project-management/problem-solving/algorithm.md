# CPM Algorithm

1. List every activity, duration, and predecessor.
2. Forward pass: compute `ES_i = max(EF_p)` over predecessors.
3. Compute `EF_i = ES_i + d_i`.
4. Backward pass from the project finish to compute latest finish and latest
   start.
5. Compute `slack_i = LS_i - ES_i`.
6. Mark every zero-slack activity as critical.
