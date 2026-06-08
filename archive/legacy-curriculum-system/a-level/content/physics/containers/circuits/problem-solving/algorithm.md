# Circuit Reduction Algorithm

1. Redraw the circuit with clear junctions and label the supply voltage.
2. Identify components in parallel: they share the same two end nodes and therefore the same potential difference.
3. Replace each parallel group using `1/R_p = 1/R_1 + 1/R_2 + ...`.
4. Add series resistances using `R_total = R_1 + R_2 + ...`.
5. Use `I_total = V_supply / R_total` to find the current before the first junction.
6. Work backwards through the circuit: use voltage division for series parts and `I = V/R` for each parallel branch.
7. Check that branch currents add to the supply current and that power has units of watt.

## Formula Panel Standard

```latex
\color{#059669}{R_p}
=\left(\frac{1}{R_2}+\frac{1}{R_3}\right)^{-1},
\quad
\color{#d97706}{I}
=\frac{\color{#2563eb}{V}}
{\color{#7c3aed}{R_s}+\color{#059669}{R_p}}
```

Use this when a series resistor feeds two parallel branch resistors. The parallel group must be reduced first because both branch resistors share the same potential difference.
