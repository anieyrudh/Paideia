# Transfer problem: service-ticket backlog

A weekly service desk has two states:

- `S`: stable backlog
- `B`: backed-up

From a stable week, 78% of next weeks remain stable. From a backed-up week,
35% of next weeks recover to stable. The current mix is 60% stable and 40%
backed-up.

## Task

1. Write the transition matrix using the column-vector convention.
2. Compute the next two weekly mixes.
3. Compute the steady-state distribution.
4. Explain why the long-run mix is not the same as saying tickets stop moving.

## Worked outline

```text
P = [[0.78, 0.35],
     [0.22, 0.65]]

x_0 = [0.60, 0.40]^T
x_1 = P x_0 = [0.78(0.60) + 0.35(0.40), 0.22(0.60) + 0.65(0.40)]^T
    = [0.608, 0.392]^T
```

Repeat once more for `x_2`. For the steady state:

```text
pi_S = 0.35 / (0.35 + 0.22) = 0.614
pi_B = 0.22 / (0.35 + 0.22) = 0.386
```

Interpretation: in the long run, about 61.4% of weeks are stable and 38.6%
are backed-up. Tickets still move between states; the aggregate flow into each
state balances the aggregate flow out.
