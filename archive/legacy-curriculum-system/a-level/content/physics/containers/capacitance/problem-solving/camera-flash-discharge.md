# Transfer Problem: Camera Flash Discharge

## Prompt

A 680 microF flash capacitor is charged to 9.0 V and then discharged through a 3.0 kOhm resistor. Find the initial stored charge, the stored energy, the time constant, and the voltage left after 4.0 s. Explain why the voltage does not fall linearly.

## Worked Route

Convert units:

```text
C = 680 microF = 680 x 10^-6 F
R = 3.0 kOhm = 3.0 x 10^3 Ohm
t = 4.0 s
```

Initial charge:

```text
Q = CV
Q = (680 x 10^-6 F)(9.0 V)
Q = 6.12 x 10^-3 C
```

Initial stored energy:

```text
U = 1/2 CV^2
U = 1/2(680 x 10^-6 F)(9.0 V)^2
U = 2.75 x 10^-2 J
```

Time constant:

```text
tau = RC
tau = (3.0 x 10^3 Ohm)(680 x 10^-6 F)
tau = 2.04 s
```

Voltage after 4.0 s:

```text
V(t) = V0 e^(-t/tau)
V(4.0 s) = (9.0 V)e^(-4.0 / 2.04)
V(4.0 s) = 1.27 V
```

Interpretation: the resistor-capacitor circuit removes the same fraction of voltage and charge in each equal time interval. The graph curves because the current is largest at the start and gets smaller as the capacitor voltage gets smaller.

## Rubric

- 1 mark: converts capacitance and resistance into SI units.
- 1 mark: calculates Q = CV with correct unit.
- 1 mark: calculates U = 1/2 CV^2 with correct unit.
- 1 mark: calculates tau = RC.
- 1 mark: uses V(t) = V0 e^(-t/tau) and interprets exponential decay.
