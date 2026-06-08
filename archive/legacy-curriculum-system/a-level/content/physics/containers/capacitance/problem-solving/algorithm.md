# Capacitance Problem-Solving Algorithm

1. Identify whether the capacitor is being charged, held at a fixed potential difference, or discharging through a resistor.
2. Convert all quantities into SI units: microfarads to farads, kilohms to ohms, milliseconds to seconds, and volts to volts.
3. Use the charge relation first:

```text
Q = CV
```

4. Use the energy relation that matches the given quantities:

```text
U = 1/2 QV = 1/2 CV^2 = Q^2 / (2C)
```

5. For a resistor-capacitor discharge, find the time constant:

```text
tau = RC
```

6. Use exponential decay for the required time:

```text
V(t) = V0 e^(-t/RC)
Q(t) = Q0 e^(-t/RC)
```

7. Interpret the result in words: state whether charge is separated or remaining, whether energy is stored or dissipated, and whether the decay is by fraction rather than by fixed amount.
