# Transfer: Search-Index Shard Merge

A search-index build splits records into three equal shards and does linear merge work at each node:

```latex
T(n) = 3T(n/3) + 2n
```

## Task

1. Write the level-cost expression.
2. Substitute `a = 3`, `b = 3`, `c = 2`, and `p = 1`.
3. Decide whether the root, every level, or the leaves dominate.
4. State the asymptotic growth and explain what the units mean.

## Rubric Anchor

A strong answer shows:

- `L_k = 3^k * 2(n/3^k) = 2n` operations per level.
- Height `h = log_3 n` levels.
- Total `Theta(n log n)` operations because every level has equal-order work.
- The explanation refers to record operations, not just an abstract formula.
