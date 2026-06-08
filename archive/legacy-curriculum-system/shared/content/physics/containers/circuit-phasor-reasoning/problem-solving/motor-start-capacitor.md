# Transfer Problem: Motor Start Capacitor

A small AC motor winding is modelled as a 30-ohm resistor in series with a
0.18 H inductance on a 50 Hz supply. A 100-microfarad capacitor is added in
series for correction. Decide whether the current leads or lags the voltage,
calculate the rms current for a 12 V rms supply, and explain the phase
relationship.

## Worked Solution

Known values:

```latex
V_{rms}=12\ \mathrm{V},\quad f=50\ \mathrm{Hz},\quad R=30\ \Omega,\quad L=0.18\ \mathrm{H},\quad C=100\times10^{-6}\ \mathrm{F}
```

Reactance:

```latex
X_L = 2\pi(50)(0.18)=56.5\ \Omega
```

```latex
X_C = \frac{1}{2\pi(50)(100\times10^{-6})}=31.8\ \Omega
```

Impedance:

```latex
Z=30+j(56.5-31.8)=30+j24.7\ \Omega
```

Magnitude:

```latex
|Z|=\sqrt{30^2+24.7^2}=38.9\ \Omega
```

Current:

```latex
I_{rms}=\frac{12}{38.9}=0.31\ \mathrm{A}
```

The net reactance is positive, so the circuit is still inductive and current
lags the voltage. The capacitor reduces the lag by subtracting from the
inductor's positive reactance.
