# Transfer Problem: Phone Charger Current

Given a 5.0 V supply, a 2.0 ohm protective resistor in series, and two parallel paths of 20 ohm and 100 ohm:

1. Reduce the parallel pair.

```latex
R_p=\left(\frac{1}{20\ \Omega}+\frac{1}{100\ \Omega}\right)^{-1}
=16.7\ \Omega
```

2. Add the series resistor.

```latex
R_{\text{total}}=2.0\ \Omega+16.7\ \Omega=18.7\ \Omega
```

3. Find total current.

```latex
I=\frac{5.0\ \mathrm{V}}{18.7\ \Omega}=0.268\ \mathrm{A}
```

The 20 ohm charging path carries more current because both branches share the same voltage and the lower resistance branch has the larger `I = V/R`.
