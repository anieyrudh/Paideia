# Rare-Fault Sensor Transfer Problem

A machine fault is rare, but the sensor is sensitive. When the sensor reports
positive, estimate whether the machine is probably faulty.

Use:

```latex
P(H \mid +) =
\frac{P(+ \mid H)P(H)}
{P(+ \mid H)P(H) + P(+ \mid \neg H)P(\neg H)}
```

Name the prior fault rate, the true-positive route, and the false-positive
route before giving the posterior.
