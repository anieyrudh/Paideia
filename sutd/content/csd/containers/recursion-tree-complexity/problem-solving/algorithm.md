# Problem-Solving Algorithm

Use this process for recurrences shaped like `T(n) = aT(n/b) + c n^p`.

1. Name the parameters: branches `a`, shrink factor `b`, combine exponent `p`, and coefficient `c`.
2. Write the level model:

```latex
L_k = a^k \cdot c(n/b^k)^p
```

3. Simplify the level model:

```latex
L_k = c n^p (a/b^p)^k
```

4. Compare the level ratio `a / b^p`.
5. Count the height:

```latex
h = \log_b n
```

6. Decide the dominant region:
   - `a / b^p < 1`: root levels dominate, `Theta(n^p)`.
   - `a / b^p = 1`: all levels are balanced, `Theta(n^p log n)`.
   - `a / b^p > 1`: leaves dominate, `Theta(n^{log_b a})`.
7. Interpret the result in the problem context, including units such as operations, items, and recursion levels.
