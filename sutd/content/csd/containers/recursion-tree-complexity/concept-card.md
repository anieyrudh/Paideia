---
subject: csd
concept: recursion-tree-complexity
branch: sutd
level: Freshmore
syllabus_ref: "SUTD CSD: Algorithms"
prerequisites:
  - dynamic-programming-state-recursion
  - graph-search-and-shortest-paths
aid_types:
  - simulation
  - misconception-audit
  - transfer-problem
status: draft
---

A recursion tree turns a recurrence into a picture of work. Each node is one subproblem, each edge is a recursive call, and each level groups subproblems of the same depth. The total work is the sum of all level costs plus the leaf/base-case work.

# Recursion Tree Complexity

## First-Principles Explanation

A recursion tree turns a recurrence into a picture of work. Each node is one subproblem, each edge is a recursive call, and each level groups subproblems of the same depth. The total work is the sum of all level costs plus the leaf/base-case work.

For a divide-and-conquer recurrence

```latex
T(n) = aT(n/b) + c n^p
```

the important comparison is not simply "how many recursive calls exist". It is the ratio between the next level's total work and the current level's total work:

```latex
\frac{L_{k+1}}{L_k} = \frac{a}{b^p}
```

If the ratio is less than 1, upper levels dominate. If it is equal to 1, every level costs the same order and the tree height contributes a logarithmic factor. If it is greater than 1, lower levels and leaves dominate.

## Why It Matters

Recursive code can look expensive because the number of calls grows as the tree expands. Recursion-tree analysis separates that visual growth from the cost per node. Merge sort has twice as many subproblems at each deeper level, but each subproblem is half as large; the total merge work per level remains `n`, so the full recurrence is `Theta(n log n)`.

## Canonical Example

For merge sort:

```latex
T(n) = 2T(n/2) + n
```

At level `k`, there are `2^k` subproblems, each of size `n/2^k`, and each node does linear merge work:

```latex
L_k = 2^k(n/2^k) = n
```

There are `log_2 n` non-leaf levels, so total work is:

```latex
T(n) = n \log_2 n + n = \Theta(n \log n)
```

The base cases still matter: they determine the height and the number of leaves. They do not change the asymptotic order in merge sort, but in other recurrences leaf work can dominate.

## Common Misconceptions

- "Recursive code is always exponential." The call count may grow, but node cost may shrink enough to keep total growth polynomial or `n log n`.
- "Only the root matters." This fails when every level costs the same order or when lower levels grow.
- "Base cases do not affect total work." Base cases set the tree height and leaf count, which are part of the total.
- "The Master theorem is a memorised table." The theorem is a compact statement of the level-cost comparison.
